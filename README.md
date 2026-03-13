# Le France Professor

A French learning application with LLM reasoning, built with hexagonal architecture and Domain-Driven Design principles.

## Architecture

This project follows hexagonal architecture (ports and adapters) for both backend and frontend:

### Backend Structure
```
backend/
├── domain/          # Core business logic, entities, value objects
├── application/     # Use cases
├── infrastructure/  # LLM integration, repositories, telemetry
└── adapters/        # HTTP handlers, routes
```

### Frontend Structure
```
frontend/
├── src/
│   ├── app/             # Next.js App Router (pages, layouts, API route handlers)
│   ├── components/      # React Client Components (interactive UI)
│   ├── domain/          # Domain models, errors, repository interfaces
│   ├── application/     # Use cases (neverthrow ResultAsync)
│   ├── infrastructure/  # HTTP repository adapter
│   └── lib/             # Server-side DI container
```

The frontend uses Next.js as a BFF (Backend for Frontend). Server Components fetch conversations directly from the Express backend before rendering — no loading states, no flash. Client Components send messages through Next.js Route Handlers, which proxy to the backend. The browser never calls the Express backend directly.

Voice transcription follows the same BFF pattern: the browser POSTs audio to `/api/transcribe` (Next.js route), which calls `TranscribeAudioUseCase` → `HttpTranscriptionRepository` → whisper.cpp server. The whisper.cpp URL is configured via `WHISPER_URL`.

Text-to-speech follows the same pattern in reverse: the browser fetches `/api/tts` (Next.js route), which calls `SynthesizeSpeechUseCase` → `HttpTtsRepository` → piper1-gpl server. The piper URL is configured via `PIPER_URL`.

Vocabulary explanations follow the same BFF pattern: the browser POSTs `{ word, context }` to `/api/conversations/:id/vocabulary` (Next.js route), which calls `ExplainVocabularyUseCase` → `HttpConversationRepository` → Express backend → `OllamaVocabularyService`. Context (the last tutor message) is resolved client-side and sent in the request body — the use case stays stateless.

## Features

- **Chat Interface**: Interactive French conversation with an AI tutor
- **Voice Input**: Students can speak French directly into the chat — audio is transcribed via whisper.cpp and placed in the input box for review and editing before sending. Adaptive UX: click-to-toggle on desktop, press-and-hold on mobile. The input placeholder shows a live recording timer (`Enregistrement… Ns`) and a transcription status (`Transcription en cours…`) so students always know what is happening while they wait.
- **Text-to-Speech**: Every tutor response has a speaker button (▶) and a slow-play button (🐢). Clicking either plays the French text via piper1-gpl — a local neural TTS engine running on port 7602. Speed is controlled server-side via `length_scale` (1.0 normal, 1.5 slow) so the slow mode produces genuinely slower phoneme duration rather than browser-stretched audio. Only one message plays at a time — starting a new one automatically stops the previous.
- **Slash Commands**: The input box supports `/vocabulary [word]` to get a contextual explanation of any French word. Typing `/` shows an autocomplete popup. The command is silent — no user bubble appears, only the vocabulary response rendered with a `📖 word` header in an indigo bubble with TTS buttons. Vocabulary lookups are not saved to conversation history.
- **Topic Initiation**: Tutor initiates conversations on interesting topics:
  - AI adoption in France
  - French culture
  - French language in the world

## API Documentation

The backend serves interactive API documentation via [Scalar](https://scalar.com) at:

```
http://localhost:3001/docs
```

The spec covers all endpoints with request/response schemas, examples, and a built-in HTTP client to try requests directly from the browser. The OpenAPI spec is defined in `backend/src/adapters/http/openapi-spec.ts`.

## Testing

Both backend and frontend follow the **Testing Trophy** — integration tests are the primary confidence signal, unit tests cover error branches, static analysis is the free bottom layer. The layers manifest differently per stack but the philosophy is unified:

| Layer | Backend | Frontend |
|---|---|---|
| Static analysis | TypeScript + ESLint | TypeScript + ESLint |
| Unit | Jest — per-layer isolation | Vitest — domain entities and use cases |
| Integration | Jest + Supertest + Nock — full HTTP stack, LLM mocked | Vitest — Route Handlers with mocked use cases |
| Component | — | Vitest + RTL + MSW — Client Components in jsdom |
| E2E | — | Playwright — full browser flow, stub backend (no Ollama) |

See [TESTING.md](./TESTING.md) for the full strategy, conventions, and how to run each layer.

## Observability

The backend emits OpenTelemetry traces covering HTTP requests, use-case executions, and LLM calls (with `gen_ai.*` semantic conventions). See [OBSERVABILITY.md](./OBSERVABILITY.md) for the full trace hierarchy, how to read console output, and how to run the local Grafana stack.

## Development

```bash
# Install dependencies
npm install

# Run backend (port 3001)
npm run dev:backend

# Run frontend (port 3000)
npm run dev:frontend

# Run all tests
npm run test:all

# Lint + typecheck (backend)
cd backend && npm run lint && npm run typecheck

# Lint + typecheck (frontend)
cd frontend && npm run lint && npm run typecheck
```

See [QUICKSTART.md](./QUICKSTART.md) for full setup instructions.
