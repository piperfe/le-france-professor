# ADR-0036: WhatsApp command handlers belong in `adapters/whatsapp/handlers/`

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🏗️ System Architecture |
| Date | 2026-05-19 |

## Context

`VocabularyWhatsAppCommand` and `NotebookWhatsAppCommand` were initially created in `application/use-cases/` alongside the use cases they call. The question was whether they are use cases or adapters.

## Decision

Command handler classes belong in `adapters/whatsapp/handlers/`, not `application/use-cases/`.

The responsibility is identical to HTTP handlers:

| HTTP | WhatsApp |
|---|---|
| `adapters/http/handlers/explain-vocabulary.ts` | `adapters/whatsapp/handlers/vocabulary-command.ts` |
| Parse HTTP request body | Parse WhatsApp regex match |
| Validate input fields | Validate command args (`trigger` / `pattern`) |
| Call use case | Call use case |
| Return HTTP response | Send WhatsApp reply |

Command classes know about WhatsApp-specific concerns (regex format, phone numbers, `WhatsAppSender`) — that is adapter knowledge, not business logic. Moving them to `adapters/whatsapp/handlers/` enforces the hexagonal boundary enforced by `eslint-plugin-boundaries` (see ADR-0031).

The `WhatsAppCommand` interface is defined in `adapters/whatsapp/handlers/whatsapp-command.ts`. After `HandleWhatsAppMessageUseCase` was dissolved into `handle-message.ts` (see ADR-0035), the interface moved to live alongside the router that enforces it — the adapter layer owns the contract it uses.

## Consequences

- The adapter layer is the single place to look for all input-parsing and validation logic across both HTTP and WhatsApp channels
- `application/use-cases/` contains only channel-agnostic orchestration — no WhatsApp-specific code
- `eslint-plugin-boundaries` will enforce that adapter files do not leak into the domain layer
- New command classes are co-located with `handle-message.ts` and `verify-webhook.ts` — natural home for all WhatsApp adapter code
