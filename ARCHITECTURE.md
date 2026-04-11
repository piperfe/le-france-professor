# Architecture

Both stacks follow hexagonal architecture (ports and adapters) with Domain-Driven Design. The core rule: domain and application layers have zero framework or infrastructure dependencies — they only depend on interfaces they define themselves.

## Backend

```
backend/
├── domain/          # Core business logic, entities, value objects
├── application/     # Use cases (neverthrow ResultAsync)
├── infrastructure/  # LLM integration, repositories, telemetry
└── adapters/        # HTTP handlers, routes
```

## Frontend

```
frontend/src/
├── domain/          # Entities, errors, repository interfaces (pure TS)
├── application/     # Use cases (neverthrow ResultAsync, pure TS, no React)
├── infrastructure/  # HTTP repository adapters (implement domain interfaces)
├── app/api/         # Next.js BFF route handlers (call use cases from container)
├── components/      # React client components (UI state, call fetch)
└── lib/container.ts # Server-side DI wiring
```

Layer order is strict — no skipping. A component may not import from `application/` directly; it goes through `app/api/` route handlers.

Backend layer boundaries are enforced automatically by `eslint-plugin-boundaries` — violations fail `npm run lint` and CI. See [ADR-0031](./docs/decisions/arch-2026-04-11-eslint-boundaries-hexagonal-enforcement.md).

## BFF pattern

The browser never calls the Express backend directly. All requests flow through Next.js as a Backend for Frontend:

```
Browser → Next.js API route → Use case → Repository → External service
```

| Flow | Route | External |
|---|---|---|
| Chat messages | `POST /api/conversations/:id/messages` | Express backend → Ollama |
| Voice transcription | `POST /api/transcribe` | whisper.cpp |
| Text-to-speech | `GET /api/tts` | piper1-gpl |
| Vocabulary | `POST /api/conversations/:id/vocabulary` | Express backend → Ollama |

Server Components fetch conversation data directly from the Express backend before rendering — no loading states, no flash. Client Components send mutations through Next.js route handlers.

## Component pattern

Every interactive feature is split into a hook and a thin component — no `useEffect` in either:

| Hook | Component | Responsibility |
|---|---|---|
| `use-tts.ts` | `TtsButton` | TTS playback, one audio at a time |
| `use-voice-input.ts` | `VoiceInputButton` | Microphone recording, adaptive desktop/mobile UX |
| `use-vocabulary-notebook.ts` | `VocabularyNotebook` | Drawer open state, highlight tracking |

Everything is event-driven (triggered by user action), not reactive (no prop-watching via `useEffect`).

## Error handling

All use cases return typed `ResultAsync` via [neverthrow](https://github.com/supermacro/neverthrow). Errors are part of the function signature — callers cannot ignore them:

```ts
execute(id: string): ResultAsync<ConversationDTO, NotFoundError | ServiceUnavailableError>
```

Backend handlers use `result.match()` to map domain error codes to HTTP status codes via a `HTTP_STATUS` lookup table — no `instanceof` chains.

---

## Architecture Decisions

The decisions that shaped this architecture are recorded in [`docs/decisions/`](./docs/decisions/):

| ADR | Decision |
|-----|----------|
| [ADR-0001](./docs/decisions/arch-2026-03-04-hexagonal-clean-architecture.md) | Hexagonal (Clean) Architecture — strict layering |
| [ADR-0002](./docs/decisions/arch-2026-03-06-bff-pattern-browser-calls-bff-only.md) | BFF Pattern — browser never calls backend directly |
| [ADR-0003](./docs/decisions/arch-2026-03-04-di-container-lib-container.md) | DI Container — lib/container.ts for server-side wiring |
| [ADR-0004](./docs/decisions/arch-2026-03-02-openapi-embedded-in-express.md) | OpenAPI docs embedded in Express — not decoupled |
| [ADR-0005](./docs/decisions/frontend-2026-03-04-tailwind-css-for-all-styling.md) | Tailwind CSS for all frontend styling |
| [ADR-0006](./docs/decisions/frontend-2026-03-06-hook-thin-component-zero-useeffect.md) | Hook + thin component — zero useEffect |
| [ADR-0007](./docs/decisions/frontend-2026-03-16-force-dynamic-static-root-page.md) | Static root page requires `export const dynamic = "force-dynamic"` |
| [ADR-0008](./docs/decisions/frontend-2026-03-09-ssr-guard-lazy-usestate.md) | SSR guard for browser-only globals via lazy useState initialiser |
| [ADR-0014](./docs/decisions/errors-2026-03-15-neverthrow-resultasync-typed-errors.md) | neverthrow ResultAsync for use cases — typed errors at the boundary |
| [ADR-0015](./docs/decisions/errors-2026-03-15-fire-and-forget-void-not-match.md) | Fire-and-forget ResultAsync: use `void`, not `.match()` |
| [ADR-0030](./docs/decisions/arch-2026-04-10-whatsapp-cloud-api-webhook.md) | WhatsApp via Meta Cloud API webhook — one conversation per phone number |
| [ADR-0031](./docs/decisions/arch-2026-04-11-eslint-boundaries-hexagonal-enforcement.md) | eslint-plugin-boundaries — automated hexagonal layer enforcement |
