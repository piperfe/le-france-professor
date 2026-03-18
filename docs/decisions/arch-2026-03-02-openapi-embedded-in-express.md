# ADR-0004: OpenAPI docs embedded in Express — not decoupled

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🏗️ System Architecture |
| Date | 2026-03-02 |

## Context

When adding Scalar API docs, the question arose: serve the docs from the existing Express app, or spin up a separate dedicated docs server.

## Decision

Serve OpenAPI spec and Scalar UI directly from the Express app (GET /openapi.json + GET /docs). No separate infrastructure for docs.

## Consequences

- Zero extra infra — the spec and the API live together, always in sync.
- If the API server goes down, the docs go down too — acceptable for a dev-focused project.
- Scalar replaced Swagger UI — modern UI, REST client built-in, MIT licensed.

## Source Conversation

> **Mar 2 — Monday — 16:51**
>
> **You:** I'm seeing you're trying to put the openAI server into the same project, we'll run the server and the server will serving a page with the OPENAPI doc ... is it right (that I'm saying) ?? there are other approuches, like decoupling the openAPI server page and the spec ???
