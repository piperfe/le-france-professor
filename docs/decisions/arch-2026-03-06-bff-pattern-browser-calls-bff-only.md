# ADR-0002: BFF Pattern — browser never calls backend directly

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🏗️ System Architecture |
| Date | 2026-03-06 |

## Context

The voice transcription feature required calling whisper.cpp from the browser. Allowing direct browser-to-service calls would expose ports, create CORS issues, and break the layering.

## Decision

All browser requests route through Next.js API routes (BFF). The browser never calls Express, whisper.cpp, or piper directly. The BFF owns server-side use case execution.

## Consequences

- Voice: browser → /api/transcribe → use case → HttpTranscriptionRepository → whisper.cpp
- TTS:   browser → /api/tts → use case → HttpTtsRepository → piper
- Chat:  browser → /api/conversations → use case → Express backend
- The BFF is the only place that knows service URLs. The browser only knows /api/* paths.

## Source Conversation

> **Mar 6 — Friday — 18:15**
>
> **You:** why you don't put a next bff route ?? then all trhough the usecase to the repository (the API) ??
