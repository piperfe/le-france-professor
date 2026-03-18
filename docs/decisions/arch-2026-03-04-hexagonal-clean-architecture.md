# ADR-0001: Hexagonal (Clean) Architecture — strict layering

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🏗️ System Architecture |
| Date | 2026-03-04 |

## Context

We needed to be able to swap external services (Ollama, whisper.cpp, piper) without touching business logic, and to keep pure TypeScript domain code free from framework dependencies.

## Decision

Adopt hexagonal architecture with four strict layers: domain → application → infrastructure → BFF. No layer may skip a level. Components call /api/ routes only — never external services directly.

## Consequences

- domain/ — pure TS entities and repository interfaces. No React, no HTTP, no external deps.
- application/ — use cases returning ResultAsync via neverthrow. No React.
- infrastructure/ — HTTP adapters that implement domain interfaces.
- app/api/ — Next.js BFF route handlers that call use cases from lib/container.ts.
- components/ — React client code that calls fetch to /api/. Never calls backend or whisper directly.

## Source Conversation

> **Mar 4 — Wednesday — 19:24**
>
> **You:** my questions was related to the async getById(conversationId: string): Promise<Conversation> { ... } in HttpConversationRepository ... is it ok throwing 'throw new ServiceUnavailableError' in this layer ??? why we do not use neverthrow here ?
