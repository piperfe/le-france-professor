# ADR-0009: Testing Trophy over Testing Pyramid — integration tests are the priority

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🧪 Testing Strategy |
| Date | 2026-03-04 |

## Context

The classic Testing Pyramid (many unit, some integration, few E2E) was designed for thin UIs. Modern React apps with hooks, context, and BFF routes need a different balance.

## Decision

Adopt the Testing Trophy (Kent C. Dodds): prioritise integration tests that exercise real component+hook slices with MSW. Unit tests for pure domain logic only. E2E for critical full-stack flows.

## Consequences

- Integration tests (RTL + MSW + jsdom) are the largest layer — they test real user behaviour.
- Unit tests only for: pure domain functions, use cases with mocked repos, utility functions.
- E2E (Playwright) covers: full conversation flow, voice input, TTS, vocabulary, sidebar.
- No snapshot tests — they test implementation, not behaviour.

## Source Conversation

> **Mar 4 — Wednesday — 12:07**
>
> **You:** let's do that ... we improved recently the error handling, drove by the automated test implementation, we separated integration from unit suites in the back end ... let's think about the front-end automated testing strategy ... can we think about different kinf of testing, the balance (quantity) and…
