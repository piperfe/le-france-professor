# ADR-0032: SQLite + Drizzle ORM for backend persistence

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🏗️ System Architecture |
| Date | 2026-04-14 |

## Context

The three backend repositories (`ConversationRepository`, `VocabularyRepository`, `PhoneSessionRepository`) were implemented as in-memory Maps. Every `npm run dev` restart wiped all conversations, vocabulary entries, and WhatsApp phone session mappings. This was acceptable during early development but became a blocker once the WhatsApp integration was in place: restarting the server for any reason would lose the phone→conversation mapping, causing the next student message to be treated as a new contact.

The project also referenced a Prisma ADR from a sibling project (`pti-salmoneras`) to inform the choice.

### Why not Prisma

Prisma's main advantages are:
- Strong type safety via generated client
- Built-in migration engine
- `LIKE`-based full-text search helpers

None of these apply here:
- Type safety is equally achievable with Drizzle's `$inferSelect`
- Drizzle-kit provides an equivalent migration engine
- There are no `LIKE` search queries in this codebase — all lookups are by exact ID or phone number

Prisma's costs in this context:
- Requires a separate `prisma generate` step that must run before TypeScript compilation
- Generates types that leak into the domain layer (the generated `Prisma.ConversationGetPayload<...>` type is an infrastructure concern but ends up in function signatures everywhere)
- Adds a binary query engine (~30 MB) that complicates deployment

### Why not PostgreSQL

A single-user tutoring app running locally does not benefit from a network-attached database. SQLite removes the operational overhead (no server to start, no connection pool to configure, no Docker dependency for tests).

## Decision

Use **SQLite** via **Drizzle ORM** with the **`better-sqlite3`** synchronous driver.

### Schema

Four tables, defined in `src/infrastructure/db/schema.ts`:

| Table | Primary key | Notes |
|-------|-------------|-------|
| `conversations` | `id` (UUID) | `title` and `topic` are nullable — set asynchronously after creation |
| `messages` | `id` (UUID) | Append-only; `ON DELETE CASCADE` from conversations |
| `vocabulary_entries` | `id` (UUID) | Ordered by `created_at`; `ON DELETE CASCADE` from conversations |
| `phone_sessions` | `phone_number` | Maps WhatsApp phone number → `conversation_id`; permanent once set |

### Conflict strategy

- **conversations** — `ON CONFLICT DO UPDATE` (title and topic change after initial save)
- **messages** — `ON CONFLICT DO NOTHING` (append-only; re-saving a conversation must not duplicate messages)
- **vocabulary_entries** — no conflict (each entry has a unique UUID)
- **phone_sessions** — `ON CONFLICT DO NOTHING` (phone→conversation mapping is permanent; a second save from a race condition must not overwrite)

### Query API

The standard Drizzle select API (`db.select().from().where()`) is used throughout — not the relational query API (`db.query.*`). The relational API requires `relations` exports in the schema and returns a different query object type. The standard API is synchronous with `better-sqlite3`, has no extra type overhead, and is simpler to read.

### Migrations

Managed by `drizzle-kit`. Migration files live in `backend/drizzle/`. The `createDatabase()` helper runs `migrate()` on startup — idempotent, applies only pending migrations.

```ts
// DATABASE_URL=./le-france.db → persists across restarts
// DATABASE_URL omitted → :memory: (tests, zero infra)
export function createDatabase(dbPath: string): DrizzleDb
```

### Testing

Repository unit tests use `:memory:` SQLite — `createDatabase(':memory:')` in `beforeEach`. Each test gets a fresh, migrated database with no external setup. This replaces the previous approach of instantiating the in-memory Map repositories directly.

## Consequences

- Conversations, vocabulary, and WhatsApp sessions survive server restarts
- `DATABASE_URL=./le-france.db` in `backend/.env` points to the file; omitting it falls back to `:memory:` (acceptable for local dev without persistence)
- Schema changes require running `npm run db:generate` in `backend/` to produce a new migration file — both the schema and the migration file must be committed together
- The three SQLite repository classes (`SqliteConversationRepository`, `SqliteVocabularyRepository`, `SqlitePhoneSessionRepository`) implement the same domain interfaces as the previous in-memory versions — no use case or handler changes were required

## Source Conversation

> **Apr 14 — Monday**
>
> **You:** yest /feature can we add database for saving conversations ???
>
> **You:** we researched in the pti-salmoneras ... for taking decisions ... the most important for analysing is the data to save ... conversations and the community around (for maintainability)
>
> **You:** and Drizzle ???
>
> **You:** let's do that Drizzle
>
> **You:** why we need phone_sessions table ?
>
> **You:** keeping the save as the single entry point
>
> **You:** when I'll run npm run dev ... every time that I'm executing the command a new db will be created ?
