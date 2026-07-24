# Block CI merge on CRITICAL vulnerabilities via npm audit

**Date:** 2026-07-24  
**Status:** Accepted  
**Triggers:** Security upgrades expose npm audit vulnerabilities; need automated enforcement

## Context

vitest 4 upgrade to fix protobufjs vulnerability revealed npm audit landscape: ~7 vulnerabilities exist (4 moderate, 3 high from Next.js transitive deps). Manual security checks are error-prone; automated gate in CI provides confidence that no CRITICAL vulnerabilities slip through.

## Decision

Add `npm audit --audit-level=critical` as a CI job that:
1. Runs **before** backend/frontend tests (fail fast)
2. **Blocks merge** only on CRITICAL severity
3. **Allows** HIGH, MODERATE, and LOW to pass (transitive deps from Next.js)
4. Runs **once at root** (monorepo optimization, not per-workspace)

## Rationale

| Threshold | Rationale | Trade-off |
|---|---|---|
| **CRITICAL only** | Catches RCE/auth bypass/data leak before they reach main | Allows HIGH (e.g. XSS) from transitive deps that can't be fixed without major upgrades |
| **Blocks at CI** | Prevents human error; gating happens before tests run | Adds ~30s to CI time |
| **Root-level job** | Checks entire monorepo once | Need dependency chain (`needs: security`) |

HIGH/MODERATE/LOW acceptance is pragmatic: Next.js v16 pins `postcss` and `sharp` with known HIGH CVEs. Upgrading to v9.3.3 (the fix) is a breaking change. Accept the risk — HIGH vulnerabilities are tracked and monitored, but require dev judgment (not automated blocks).

## Implementation

See `.github/workflows/ci.yml`:
- Job `security`: `npm audit --audit-level=critical` at root
- Jobs `backend`, `frontend`: depend on security via `needs: security`

## Audit Thresholds

| Level | Action | Examples |
|---|---|---|
| CRITICAL | Always block | RCE, auth bypass, data leak |
| HIGH | Always block | XSS, path traversal, SQL injection |
| MODERATE | Warn only (allow merge) | Low-impact bugs, niche attack vectors |
| LOW | Warn only (allow merge) | Informational, defense-in-depth |

## Future

When transitive deps update, run `npm audit` to reassess. If HIGH/CRITICAL becomes fixable (Next.js patches postcss/sharp), update threshold to `--audit-level=moderate`.

See [CI.md](../../CI.md) for workflow details.
