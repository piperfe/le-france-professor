# Pin GitHub Actions to commit SHAs for supply chain security

**Date:** 2026-07-24  
**Status:** Accepted  
**Context:** Security best practice from pti-salmoneras-back project

## Context

GitHub Actions are third-party code running in CI/CD pipelines with access to repository secrets (GITHUB_TOKEN, registry credentials, SSH keys). Each action is versioned via Git tags (`@v4`, `@v3`) which are **mutable** — a maintainer can reassign or delete a tag, or their account can be compromised. If a tag is reassigned to a malicious commit, workflows silently execute the new code on the next run with no audit trail.

**Attack example:** `docker/build-push-action@v6` could be retagged to exfiltrate `GITHUB_TOKEN` before pushing images.

This is a known supply chain attack vector. GitHub Actions security advisories recommend pinning to **full commit SHAs** instead of tags.

## Decision

All GitHub Actions in `.github/workflows/*.yml` are pinned to their **full commit SHA**, not version tags. Each includes a comment with the human-readable tag for reference:

```yaml
# Before (mutable):
- uses: actions/checkout@v4
- uses: docker/login-action@v3

# After (immutable):
- uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4
- uses: docker/login-action@c94ce9fb468520275223c153574b00df6fe4bcc9 # v3
```

The commit SHA is **immutable**. Even if the tag is reassigned, the workflow executes the original code at that SHA. Future updates are applied explicitly via manual audit and commit.

## How to Update a Pinned Action

When upgrading an action (e.g., `checkout@v4` → `checkout@v5`):

1. Read the action's release notes on GitHub
2. Find the new commit SHA via:
   ```bash
   git ls-remote --tags https://github.com/actions/checkout | grep v5
   # Copy the full SHA from the output
   ```
   Or visit the release tag on GitHub and copy the SHA from the "Commits" tab.

3. Update both SHA and comment in the workflow:
   ```yaml
   - uses: actions/checkout@<new-sha> # v5
   ```

4. Commit and push — the workflow uses the new SHA on next run

## Consequences

- **Increased security:** Malicious tag reassignment does not auto-upgrade workflows
- **Explicit updates:** Action version bumps become auditable commits (update both SHA and comment)
- **Maintenance:** New/updated actions require a one-time manual step to find the SHA
- **Rollback clarity:** Can quickly revert to a known-good SHA without guessing what the tag points to now
- **Applied to all workflows:** Consistency across `.github/workflows/*.yml`

## References

- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#using-third-party-actions)
- [SLSA Framework](https://slsa.dev/) — supply chain security model
- See also: pti-salmoneras-back `infra-2026-07-01-github-actions-pinning.md`
