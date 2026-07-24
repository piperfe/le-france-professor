# CI Pipeline

Automated testing, security checks, and Docker image builds run on every push to `main` and on pull requests.

## Workflow

```
Push/PR to main
    ↓
[security] npm audit --audit-level=critical (timeout: 45min)
    ├─ CRITICAL detected?
    │   └─ ✗ FAIL — block merge
    └─ No CRITICAL?
        └─ ✓ PASS
            ↓
    [test-backend]         [test-frontend]    (parallel, timeout: 45min)
    ├─ Type check          ├─ Type check
    ├─ Lint                ├─ Lint
    ├─ Unit tests          ├─ Tests
    ├─ Integration tests   ├─ Build
    │                      ├─ E2E tests
    └─ Done                └─ Done
            ↓
    All tests passed?
            ↓
    [build-backend]        [build-frontend]   (parallel, timeout: 45min)
    ├─ Build backend       ├─ Build frontend
    │  image               │  image
    └─ Push to GHCR        └─ Push to GHCR
            ↓
    ✓ Images ready for deployment
```

## Security & Reliability

### GitHub Actions Supply Chain Hardening
- All GitHub Actions pinned to **immutable commit SHAs** (not version tags)
- Prevents malicious tag reassignment attacks
- Updates require manual audit and explicit commit
- See: [ADR: ci-2026-07-24-github-actions-pinning.md](./docs/decisions/ci-2026-07-24-github-actions-pinning.md)

### Job Timeouts
- All jobs have **`timeout-minutes: 45`** to fail fast on runaway processes
- Prevents 6-hour hangs; catches infrastructure issues early
- Longest path: ~40 min (security + tests + build) → 45-min buffer
- See: [ADR: ci-2026-07-24-job-timeouts-and-patterns.md](./docs/decisions/ci-2026-07-24-job-timeouts-and-patterns.md)

## Jobs

### Security
- **Name:** Security Audit
- **Duration:** ~30s
- **Runs first** — blocks backend/frontend if fails
- **Command:** `npm audit --audit-level=critical` (pinned to SHA)
- **Fails on:** CRITICAL vulnerabilities only
- **Allows:** HIGH, MODERATE, LOW (transitive deps from Next.js monitored separately)
- **Timeout:** 45 minutes
- **See:** 
  - [ADR: npm-audit-security-gate](./docs/decisions/ci-2026-07-24-npm-audit-security-gate.md)
  - [ADR: github-actions-pinning](./docs/decisions/ci-2026-07-24-github-actions-pinning.md)

### Test · Backend
- **Job name:** `test-backend`
- **Type check:** TypeScript compilation
- **Lint:** ESLint + eslint-plugin-boundaries
- **Unit tests:** Jest (all layers)
- **Integration tests:** Jest + Supertest + Nock (Express + SQLite)
- **Depends on:** security job passes
- **Timeout:** 45 minutes
- **Fails:** Tests fail → both build jobs skipped (fail-fast)
- **See:** [TESTING.md — Backend](./TESTING.md#backend-tests)

### Test · Frontend
- **Job name:** `test-frontend`
- **Type check:** TypeScript compilation
- **Lint:** ESLint
- **Tests:** Vitest (unit + integration + component)
- **Build:** Next.js production build
- **E2E tests:** Playwright (full stack)
- **Depends on:** security job passes
- **Timeout:** 45 minutes
- **Fails:** Tests fail → both build jobs skipped (fail-fast)
- **See:** [TESTING.md — Frontend](./TESTING.md#frontend-tests)

### Build · Backend image
- **Job name:** `build-backend`
- **Duration:** 10–20 min (GHA cache hits: 2–5 min)
- **Runs only on:** Push to main (not on pull_request)
- **Depends on:** test-backend AND test-frontend jobs pass (strict fail-fast)
- **Timeout:** 45 minutes
- **Image:** `ghcr.io/$repo/backend:latest` + `ghcr.io/$repo/backend:$SHA`
- **Cache:** GitHub Actions cache (type=gha) for efficient layer reuse
  - First build: full compile (~20 min)
  - Subsequent builds: reuse cached layers (~2–5 min)
  - Cache persists across branch pushes within repo
- **Pinning:** All Docker actions pinned to commit SHAs
- **Runs in parallel with:** build-frontend (both images build simultaneously after tests pass)
- **See:** [ADR: github-actions-pinning](./docs/decisions/ci-2026-07-24-github-actions-pinning.md)

### Build · Frontend image
- **Job name:** `build-frontend`
- **Duration:** 10–20 min (GHA cache hits: 2–5 min)
- **Runs only on:** Push to main (not on pull_request)
- **Depends on:** test-backend AND test-frontend jobs pass (strict fail-fast)
- **Timeout:** 45 minutes
- **Image:** `ghcr.io/$repo/frontend:latest` + `ghcr.io/$repo/frontend:$SHA`
- **Cache:** GitHub Actions cache (type=gha) for efficient layer reuse
  - First build: full compile (~20 min)
  - Subsequent builds: reuse cached layers (~2–5 min)
  - Cache persists across branch pushes within repo
- **Pinning:** All Docker actions pinned to commit SHAs
- **Runs in parallel with:** build-backend (both images build simultaneously after tests pass)
- **See:** [ADR: github-actions-pinning](./docs/decisions/ci-2026-07-24-github-actions-pinning.md)

## Local Pre-merge Check

Before pushing, run security audit locally:

```bash
npm audit --audit-level=critical
```

If it fails (CRITICAL found), fix the vulnerability before pushing. HIGH/MODERATE/LOW are allowed and will pass CI (but should be reviewed in `npm audit` output).

## Job Dependency Graph (Fail-Fast)

```
security ────────────────────┐
                             ├─→ build-backend (only on push)
test-backend ──┐             │
               ├──→ ─────────┤
test-frontend ─┘             ├─→ build-frontend (only on push)
```

If security fails, test jobs are skipped. If either test job fails, both build jobs are skipped. This prevents expensive Docker builds from running after test failures, maintaining strict fail-fast guarantees.

## Interpreting Failures

| Failure | Cause | Fix |
|---|---|---|
| `security` fails | CRITICAL vulnerability detected | Upgrade package immediately; blocks test-backend and test-frontend jobs |
| `test-backend` fails | Type check, lint, or test failure in backend | Run `npm run typecheck -w backend`, `npm run lint -w backend`, or `npm run test:integration -w backend` locally |
| `test-frontend` fails | Type check, lint, test, or E2E failure in frontend | Run `npm run typecheck`, `npm run lint`, or `npm run test` in `frontend/` locally; retry E2E (Playwright can be flaky) |
| `build-backend` fails | Docker build error in backend | Run `docker compose build backend` locally; check `backend/Dockerfile` and dependency imports |
| `build-frontend` fails | Docker build error in frontend | Run `docker compose build frontend` locally; check `frontend/Dockerfile` and standalone output configuration |
| Docker push fails | Registry auth issue or network | Rare; usually transient. Retry the workflow from GitHub Actions UI or check GHCR credentials. |

## Monitoring

GitHub Actions dashboard: `.github/workflows/ci.yml`

Long-term security health is tracked via periodic `npm audit` reviews (not automated) to catch when transitive deps can be upgraded to versions that fix vulnerabilities.
