# ADR-0034: Channel-agnostic vocabulary use case — context and sourceMessageId resolved server-side

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🏗️ System Architecture |
| Date | 2026-05-18 |

## Context

**Epic:** [WhatsApp Homologation — Front-end → WhatsApp Experience](https://www.notion.so/340b476cc3b7815caa0ce3087bca2e50)
**Ticket:** [[WhatsApp] Slash Commands — /vocabulary server-side parsing](https://www.notion.so/340b476cc3b78128a231cb2a5da6ec3c)

The goal was to let WhatsApp students type `/vocabulary [word]` and receive a contextual French explanation — mirroring the front-end slash command. The Notion ticket specified: *"Routes to the vocabulary explanation use case (same one the front-end calls)"*.

The problem was there was no single shared use case. The vocabulary flow was split across three backend use cases:

- `ExplainVocabularyUseCase` — wrapped the LLM vocabulary service call
- `SaveVocabularyUseCase` — persisted the entry to the DB
- `HandleWhatsAppVocabularyCommandUseCase` — orchestrated the two above and sent the reply via `WhatsAppSender`

The HTTP handler called `ExplainVocabularyUseCase` and `SaveVocabularyUseCase` directly (save was fire-and-forget). WhatsApp called `HandleWhatsAppVocabularyCommandUseCase`.

Two additional problems surfaced during implementation:

**1. The WhatsApp use case still had a channel-specific name after delivery moved out.**
Once `WhatsAppSender` was moved up to `HandleWhatsAppMessageUseCase` (which already ended all three branches with `reply()`), `HandleWhatsAppVocabularyCommandUseCase` had no WhatsApp-specific logic. It was "explain a word in a conversation and save it" — nothing more.

**2. Context and `sourceMessageId` were computed redundantly in the client layer.**
The front-end (`chat-client.tsx`) resolved the last tutor message before calling `POST /vocabulary`, sending `{ word, context, sourceMessageId }`. The WhatsApp path fetched the last tutor message content for context but hardcoded `sourceMessageId = ''`. The DB already had both values in the same row.

## Decision

**Flatten and unify:**
Delete `HandleWhatsAppVocabularyCommandUseCase`, `ExplainVocabularyUseCase`, and `SaveVocabularyUseCase`. Replace them with a single `ExplainVocabularyInConversationUseCase` that:

1. Calls `conversationRepository.getLastTutorMessage(conversationId): Promise<Message | null>` — returns the full domain entity, which carries both `content` (LLM context) and `id` (sourceMessageId) from one DB read
2. Calls `vocabularyService.explainVocabulary(word, context)` directly
3. Constructs a `VocabularyEntry` and calls `vocabularyRepository.save(entry)` directly
4. Returns `string` (the explanation text) — delivery is the caller's concern

`ExplainVocabularyInConversationUseCase` takes `ConversationRepository`, `VocabularyService`, and `VocabularyRepository` — no channel-specific dependency. Both HTTP and WhatsApp call `execute(conversationId, word)`.

**Simplify the HTTP contract:**
`POST /conversations/:id/vocabulary` request body reduced from `{ word, context, sourceMessageId }` to `{ word }`. Context and sourceMessageId are internal details resolved from the DB.

**`getLastTutorMessage` returns `Message | null` (not `string | null`):**
The previous return type was `string | null` (content only). Changed to `Message | null` so both `content` and `id` come from the same row without a second query.

## Consequences

- One use case serves both HTTP and WhatsApp — the Notion ticket goal ("same one the front-end calls") is met
- `POST /vocabulary` API is simpler: callers send only `word`; context and sourceMessageId are internal
- The save is now chained (not fire-and-forget) for the HTTP path — a save failure returns 503. Previously the front-end showed a vocabulary card even if the entry was not persisted, causing the notebook to be out of sync on reload
- `ExplainVocabularyUseCase` and `SaveVocabularyUseCase` are deleted — each was called from exactly one place and owned no independently testable boundary
- Repository tests for `getLastTutorMessage` now verify the full `Message` entity round-trip (id, content, sender, timestamp), not just the content string
