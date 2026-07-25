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
    ┌────────────────────────────────────────────┐
    │ ONLY ON PUSH TO MAIN (not on pull_request) │
    └────────────────────────────────────────────┘
            ↓
    [build-backend]        [build-frontend]   (parallel, timeout: 45min)
    ├─ Build backend       ├─ Build frontend
    │  image               │  image
    └─ Push to GHCR        └─ Push to GHCR
            ↓
    [deploy-backend]                           (timeout: 45min, only after build-backend passes)
    ├─ Create Docker context (SSH)
    ├─ Write runtime secrets to .env.docker
    ├─ Clean up stale network (zero-downtime)
    ├─ Log in to GHCR
    ├─ Pull backend image (whisper/piper build locally)
    ├─ Run DB migrations
    ├─ Start services (docker-compose)
    ├─ Wait for health checks
    ├─ Verify /api/health
    └─ Cleanup old images
            ↓
    ✓ Frontend (Vercel auto-deploys)
    ✓ Backend deployed to Oracle Cloud
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
- **Duration:** 20–40 min (multi-arch compilation; GHA cache hits: 5–10 min)
- **Runs only on:** Push to main (not on pull_request)
- **Depends on:** test-backend AND test-frontend jobs pass (strict fail-fast)
- **Timeout:** 45 minutes
- **Image:** `ghcr.io/$repo/backend:latest` + `ghcr.io/$repo/backend:$SHA` (multi-arch manifest)
- **Platforms:** `linux/amd64` (GitHub Actions x86_64) + `linux/arm64` (Oracle Cloud Ampere)
- **Cache:** GitHub Actions cache (type=gha) for efficient layer reuse
  - First build: full compile per platform (~20–40 min)
  - Subsequent builds: reuse cached layers per platform (~5–10 min)
  - Cache persists across branch pushes within repo
- **Pinning:** All Docker actions pinned to commit SHAs
- **Runs in parallel with:** build-frontend (both images build simultaneously after tests pass)
- **See:** [ADR: github-actions-pinning](./docs/decisions/ci-2026-07-24-github-actions-pinning.md)

### Build · Frontend image
- **Job name:** `build-frontend`
- **Duration:** 20–40 min (multi-arch compilation; GHA cache hits: 5–10 min)
- **Runs only on:** Push to main (not on pull_request)
- **Depends on:** test-backend AND test-frontend jobs pass (strict fail-fast)
- **Timeout:** 45 minutes
- **Image:** `ghcr.io/$repo/frontend:latest` + `ghcr.io/$repo/frontend:$SHA` (multi-arch manifest)
- **Platforms:** `linux/amd64` (GitHub Actions x86_64) + `linux/arm64` (Oracle Cloud Ampere)
- **Cache:** GitHub Actions cache (type=gha) for efficient layer reuse
  - First build: full compile per platform (~20–40 min)
  - Subsequent builds: reuse cached layers per platform (~5–10 min)
  - Cache persists across branch pushes within repo
- **Pinning:** All Docker actions pinned to commit SHAs
- **Runs in parallel with:** build-backend (both images build simultaneously after tests pass)
- **See:** [ADR: github-actions-pinning](./docs/decisions/ci-2026-07-24-github-actions-pinning.md)

### Build · Whisper image (with STT model)
- **Job name:** `build-whisper`
- **Duration:** 60–90 min (multi-arch: ~40–50 min per platform + model download ~47 sec per platform)
- **Runs only on:** Push to main (not on pull_request)
- **Depends on:** test-backend AND test-frontend jobs pass (strict fail-fast)
- **Timeout:** 45 minutes
- **Image:** `ghcr.io/$repo/whisper:latest` + `ghcr.io/$repo/whisper:$SHA` (multi-arch manifest, with embedded ggml-small.bin ~250 MB)
- **Platforms:** `linux/amd64` (GitHub Actions x86_64) + `linux/arm64` (Oracle Cloud Ampere)
- **What's inside:**
  - whisper.cpp server binary (compiled from source in builder stage for target architecture)
  - Multilingual STT model (ggml-small.bin, ~250 MB, downloaded from Hugging Face)
- **Cache:** GitHub Actions cache speeds up whisper.cpp compilation; cached separately per platform
- **Pinning:** All Docker actions pinned to commit SHAs
- **Runs in parallel with:** build-backend + build-frontend + build-piper
- **See:** [ADR-0042: Embed voice models in Docker images](./docs/decisions/docker-2026-07-25-embed-voice-models-in-images.md)

### Build · Piper image (with TTS model)
- **Job name:** `build-piper`
- **Duration:** 25–35 min (multi-arch: ~12–17 min per platform + model download ~60 MB per platform)
- **Runs only on:** Push to main (not on pull_request)
- **Depends on:** test-backend AND test-frontend jobs pass (strict fail-fast)
- **Timeout:** 45 minutes
- **Image:** `ghcr.io/$repo/piper:latest` + `ghcr.io/$repo/piper:$SHA` (multi-arch manifest, with embedded fr_FR-upmc-medium model ~60 MB)
- **Platforms:** `linux/amd64` (GitHub Actions x86_64) + `linux/arm64` (Oracle Cloud Ampere)
- **What's inside:**
  - piper1-gpl HTTP server (architecture-appropriate wheel installed: arm64 or x86_64)
  - French TTS voice model (fr_FR-upmc-medium, ~60 MB, downloaded from Hugging Face)
  - Model config (fr_FR-upmc-medium.onnx.json)
- **Cache:** GitHub Actions cache speeds up Python dependency installation; cached separately per platform
- **Pinning:** All Docker actions pinned to commit SHAs
- **Runs in parallel with:** build-backend + build-frontend + build-whisper
- **See:** [ADR-0042: Embed voice models in Docker images](./docs/decisions/docker-2026-07-25-embed-voice-models-in-images.md)

### Deploy · Backend to Oracle Cloud
- **Job name:** `deploy-backend`
- **Duration:** 2–4 min (image pulls only, no builds)
- **Runs only on:** Push to main (not on pull_request)
- **Depends on:** build-backend, build-frontend, build-whisper, build-piper jobs all pass
- **Timeout:** 45 minutes
- **Pattern:** Docker context over SSH (no appleboy/ssh-action, more efficient)
- **Flow:**
  1. Create Docker context pointing to Oracle VM via SSH
  2. Clean up stale network (zero-downtime restart)
  3. Pull pre-built Docker images from GHCR (backend, frontend, whisper, piper — all with models embedded)
  4. Run database migrations: `docker compose run --rm backend npm run db:migrate`
  5. Start voice services first (whisper, piper)
  6. Wait for health checks (whisper, piper both healthy, ~60 sec max)
  7. Start backend service
  8. Wait for backend health (~30 sec max)
  9. Verify backend API endpoint `/api/health`
  10. Cleanup old images: `docker image prune -af --filter "until=168h"`
- **Key differences from local dev:**
  - Local: `docker compose up -d` builds images locally if needed (`pull_policy: missing`)
  - Prod: Explicit `docker compose pull` pulls all pre-built images (models already embedded)
  - Prod: Manual orchestration ensures whisper/piper are healthy before backend starts
- **Secrets required:** VM_HOST, VM_USER, VM_SSH_KEY, VM_HOST_KEY (from GitHub production environment)
- **Environment variables:** LLM_MODEL, LLM_BASE_URL, LLM_API_KEY, NODE_ENV, OTEL_TRACES_EXPORTER, WHISPER_URL, PIPER_URL
- **See:** [DEPLOYMENT.md](./DEPLOYMENT.md) + [ADR-0041: Oracle Always Free deployment](./docs/decisions/deployment-2026-07-25-oracle-always-free-groq-api.md) + [ADR-0042: Embed voice models in images](./docs/decisions/docker-2026-07-25-embed-voice-models-in-images.md)

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
