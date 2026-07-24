# CI Pipeline

Automated testing and security checks run on every push to `main` and on pull requests.

## Workflow

```
Push/PR to main
    ↓
[security] npm audit --audit-level=high
    ├─ HIGH/CRITICAL detected?
    │   └─ ✗ FAIL — block merge
    └─ MODERATE/LOW only?
        └─ ✓ PASS
            ↓
    [backend]              [frontend]    (parallel)
    ├─ Type check          ├─ Type check
    ├─ Lint                ├─ Lint
    ├─ Unit tests          ├─ Tests
    ├─ Integration tests   ├─ Build
    │                      ├─ E2E tests
    └─ Done                └─ Done
            ↓
    All jobs passed
            ↓
    ✓ Ready to merge
```

## Jobs

### Security
- **Name:** `npm audit --audit-level=critical`
- **Duration:** ~30s
- **Runs first** — blocks backend/frontend if it fails
- **Fails on:** CRITICAL vulnerabilities only
- **Allows:** HIGH, MODERATE, LOW (transitive deps from Next.js monitored separately)
- **See:** [ADR: npm-audit-security-gate](./docs/decisions/ci-2026-07-24-npm-audit-security-gate.md)

### Backend
- **Type check:** TypeScript compilation
- **Lint:** ESLint + eslint-plugin-boundaries
- **Unit tests:** Jest (all layers)
- **Integration tests:** Jest + Supertest + Nock (Express + SQLite)
- **Depends on:** security job
- **See:** [TESTING.md — Backend](./TESTING.md#backend-tests)

### Frontend
- **Type check:** TypeScript compilation
- **Lint:** ESLint
- **Tests:** Vitest (unit + integration + component)
- **Build:** Next.js production build
- **E2E tests:** Playwright (full stack)
- **Depends on:** security job
- **See:** [TESTING.md — Frontend](./TESTING.md#frontend-tests)

## Local Pre-merge Check

Before pushing, run security audit locally:

```bash
npm audit --audit-level=critical
```

If it fails (CRITICAL found), fix the vulnerability before pushing. HIGH/MODERATE/LOW are allowed and will pass CI (but should be reviewed in `npm audit` output).

## Interpreting Failures

| Failure | Cause | Fix |
|---|---|---|
| `npm audit` finds HIGH/CRITICAL | New or updated vulnerability in dependencies | Upgrade package or wait for patch |
| Backend type check fails | TypeScript error in backend code | Run `npm run typecheck -w backend` locally |
| Frontend type check fails | TypeScript error in frontend code | Run `npm run typecheck` in `frontend/` |
| Tests fail | New test failures or regressions | Run tests locally: `npm run test` |
| Build fails | Next.js build error (imports, config) | Run `npm run build` in `frontend/` |
| E2E fails | End-to-end test flakiness or regression | Run `npm run test:e2e` in `frontend/` |

## Monitoring

GitHub Actions dashboard: `.github/workflows/ci.yml`

Long-term security health is tracked via periodic `npm audit` reviews (not automated) to catch when transitive deps can be upgraded to versions that fix vulnerabilities.
