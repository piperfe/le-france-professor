# Add job timeouts and fail-fast patterns to CI pipeline

**Date:** 2026-07-24  
**Status:** Accepted  
**Context:** CI reliability and resource optimization from pti-salmoneras-back project

## Context

GitHub Actions jobs default to 360-minute (6-hour) timeouts. Without explicit limits, runaway processes (infinite loops, deadlocks, hung network calls) consume CI resources for hours before discovery. This delays feedback and wastes resources.

Additionally, the job dependency graph should use `needs:` to enforce ordering and fail fast when critical jobs (security, tests) fail before triggering expensive downstream jobs (build, deploy).

## Decision

### Job Timeouts

All CI jobs have **`timeout-minutes: 45`** to catch hung/infinite-loop processes early:

```yaml
jobs:
  security:
    timeout-minutes: 45
  backend:
    timeout-minutes: 45
  frontend:
    timeout-minutes: 45
  build:
    timeout-minutes: 45
```

**Why 45 minutes?**

- Security audit: ~30s
- Backend tests: 5–10 min
- Frontend tests + build + E2E: 10–20 min  
- Docker build (with cache): 15–30 min
- **Longest path:** ~40 min → 45-min timeout provides 5-min safety buffer

**Trade-offs:**

| Choice | Pro | Con |
|--------|-----|-----|
| 45 min | Fails fast on runaway; catches infrastructure issues early | Unusual builds (cold cache, first run) might timeout |
| 360 min (default) | Never times out on long work | Hangs consume resources for hours |

### Job Dependency Graph (fail fast)

Jobs should declare `needs:` to enforce ordering and skip downstream jobs if upstream fails:

```yaml
jobs:
  security:
    # Runs first — no dependencies
    
  backend:
    needs: security  # Skip if security fails
    
  frontend:
    needs: security  # Skip if security fails
    
  build:
    needs: [backend, frontend]  # Skip if tests fail
```

This prevents expensive Docker builds from running if tests haven't passed.

## Consequences

- **Faster feedback:** Runaway processes caught within 45 min, not 6 hours
- **Resource savings:** Failed jobs don't trigger expensive downstream jobs
- **Early warning:** Infrastructure issues (network, disk) surface quickly
- **Predictability:** Builds consistently fail/pass in known time windows

## References

- pti-salmoneras-back `infra-2026-06-17-deploy-mechanism.md` (job timeouts section)
- [GitHub Actions default timeout](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobtimeout-minutes)
