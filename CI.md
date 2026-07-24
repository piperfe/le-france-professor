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
    [backend]              [frontend]    (parallel, timeout: 45min)
    ├─ Type check          ├─ Type check
    ├─ Lint                ├─ Lint
    ├─ Unit tests          ├─ Tests
    ├─ Integration tests   ├─ Build
    │                      ├─ E2E tests
    └─ Done                └─ Done
            ↓
    All tests passed?
            ↓
    [build] (only on push, timeout: 45min)
    ├─ Build backend image → ghcr.io/*/backend:SHA
    ├─ Build frontend image → ghcr.io/*/frontend:SHA
    └─ Push to GitHub Container Registry
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

### Backend
- **Type check:** TypeScript compilation
- **Lint:** ESLint + eslint-plugin-boundaries
- **Unit tests:** Jest (all layers)
- **Integration tests:** Jest + Supertest + Nock (Express + SQLite)
- **Depends on:** security job passes
- **Timeout:** 45 minutes
- **Fails:** Tests fail → build job skipped (fail-fast)
- **See:** [TESTING.md — Backend](./TESTING.md#backend-tests)

### Frontend
- **Type check:** TypeScript compilation
- **Lint:** ESLint
- **Tests:** Vitest (unit + integration + component)
- **Build:** Next.js production build
- **E2E tests:** Playwright (full stack)
- **Depends on:** security job passes
- **Timeout:** 45 minutes
- **Fails:** Tests fail → build job skipped (fail-fast)
- **See:** [TESTING.md — Frontend](./TESTING.md#frontend-tests)

### Build
- **Name:** Build · Push images
- **Duration:** 15–30 min (GHA cache hits: 3–5 min)
- **Runs only on:** Push to main (not on pull_request)
- **Depends on:** backend AND frontend jobs pass
- **Timeout:** 45 minutes
- **Images:** Docker multi-stage build for backend and frontend
  - Backend: `ghcr.io/$repo/backend:latest` + `ghcr.io/$repo/backend:$SHA`
  - Frontend: `ghcr.io/$repo/frontend:latest` + `ghcr.io/$repo/frontend:$SHA`
- **Cache:** GitHub Actions cache (type=gha) for efficient layer reuse
  - First build: full compile (~25 min)
  - Subsequent builds: reuse cached layers (~3–5 min)
  - Cache persists across branch pushes within repo
- **Pinning:** All Docker actions pinned to commit SHAs
- **See:** [ADR: github-actions-pinning](./docs/decisions/ci-2026-07-24-github-actions-pinning.md)

## Local Pre-merge Check

Before pushing, run security audit locally:

```bash
npm audit --audit-level=critical
```

If it fails (CRITICAL found), fix the vulnerability before pushing. HIGH/MODERATE/LOW are allowed and will pass CI (but should be reviewed in `npm audit` output).

## Job Dependency Graph (Fail-Fast)

```
security ──────┐
               ├─→ build (only on push)
backend ──┐    │
          ├──→ (all tests must pass)
frontend ─┘    │
```

If security fails, backend/frontend are skipped. If backend or frontend fails, build is skipped. This prevents expensive Docker builds from running after test failures.

## Interpreting Failures

| Failure | Cause | Fix |
|---|---|---|
| `npm audit` finds CRITICAL | New or updated critical vulnerability | Upgrade package immediately; blocks all downstream jobs |
| Backend type check fails | TypeScript error in backend code | Run `npm run typecheck -w backend` locally; fixes security/build jobs too |
| Frontend type check fails | TypeScript error in frontend code | Run `npm run typecheck` in `frontend/` locally; fixes security/build jobs too |
| Tests fail | New test failures or regressions | Run tests locally: `npm run test -w backend` or `npm run test` in `frontend/` |
| Build fails | Docker build error (Dockerfile, dependencies) | Run `docker compose build backend frontend` locally; check Dockerfile and package-lock.json |
| E2E fails | End-to-end test flakiness or regression | Run `npm run test:e2e` in `frontend/` locally; retry once (Playwright can be flaky) |
| Docker push fails | Registry auth issue or network | Rare; usually transient. Retry the workflow from GitHub Actions UI. |

## Monitoring

GitHub Actions dashboard: `.github/workflows/ci.yml`

Long-term security health is tracked via periodic `npm audit` reviews (not automated) to catch when transitive deps can be upgraded to versions that fix vulnerabilities.
