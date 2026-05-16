# ADR-0033: Centralized env var validation via Zod + dedicated server entry point

## Status

Accepted

## Context

Environment variables were read directly from `process.env` inside `createApp()` via two helper functions (`ensureOllamaConfig`, `getWhatsAppConfig`). This created three problems:

1. **DB pollution** — `import 'dotenv/config'` was a module-level side effect in `index.ts`. Every integration test that imported `createApp` loaded `backend/.env`, setting `DATABASE_URL=./le-france.db` and writing test data to the real file-based database.
2. **Asymmetric injection** — WhatsApp and Whisper vars were read from `process.env` inside `createApp()`, while other services (Ollama) received their config via constructor. No consistent pattern.
3. **Silent failures** — A missing or malformed env var would crash at the point of use deep inside a service, not at startup with a clear message.

Alternatives considered:

- **envalid** — well-known library, but adds a dependency for something Zod (already used in the codebase) handles directly. Rejected.
- **Typed config object** (`config.ts` exporting constants) — avoids Zod schema but loses validation and error messages. Rejected.
- **Raw `process.env` with `require.main === module` guard** — keeps the current file structure but relies on a CommonJS idiom that conflicts with the ESLint `no-require-imports` rule. Rejected.

## Decision

**`env.ts`** — single Zod schema validates all env vars and returns a typed `Env` object. No defaults in the schema — every var must be explicitly set in `.env`. Missing or invalid vars fail immediately at parse time with a field-level error message.

**`server.ts`** — dedicated server entry point that owns all boot concerns in order: `dotenv/config` (first), telemetry setup (second), `parseEnv()` (exits with a clear message on failure), then `createApp(env)`.

**`index.ts`** — pure library module. No `import 'dotenv/config'`, no `process.env` reads, no side effects. Exports only `createApp(env: Env)`.

All services receive their config symmetrically via `createApp(env)` — no service reads `process.env` internally.

## Consequences

- Integration tests import `createApp` directly from `index.ts` without triggering `dotenv/config` — DB isolation is structural, not conditional.
- `testEnv()` in `src/test/integration/test-env.ts` provides a typed `Env` with `db: { url: ':memory:' }` for all integration tests.
- A missing env var at startup prints a structured error listing every failing field before the process exits, instead of crashing at first use.
- `WHISPER_URL` is now a required field (previously defaulted internally) — it must appear in `backend/.env`.
