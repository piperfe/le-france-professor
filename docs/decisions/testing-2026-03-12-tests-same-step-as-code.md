# ADR-0013: Tests are written in the same step as code — never deferred

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🧪 Testing Strategy |
| Date | 2026-03-12 |

## Context

During several features, tests were deferred to a follow-up step and never written. Specific incident: the backend test for the conversations list was skipped alongside the feature code.

## Decision

Every code change ships with tests in the same commit. If a feature has no test, the feature is not done. Deleted production code always deletes its tests too.

## Consequences

- No "TODO: add tests" comments.
- The before-commit checklist enforces this: coverage intent is verified before every commit.
- Tests describe behaviour, not implementation — test names use user-facing language.

## Source Conversation

> **Mar 12 — Thursday — 14:37**
>
> **You:** did you add test ??? in the backend ??? please read the new files and their tests (or select a different feature and analayse the layers and the test intent) and update the coverage please ... it's important to create/update/delete the test at the same time that we're building the layers
