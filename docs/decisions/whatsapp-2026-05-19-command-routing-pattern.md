# ADR-0035: WhatsApp command routing — injected `WhatsAppCommand[]`, commands own sending

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🏗️ System Architecture |
| Date | 2026-05-19 |

## Context

`HandleWhatsAppMessageUseCase` originally handled `/vocabulary` and `/notebook` inline — 7 constructor dependencies, `handleNotebook()` and related logic embedded in the use case. Adding a third command would require modifying the use case directly.

Three options were considered:

**Option A — Commands injected as `WhatsAppCommand[]`, each command owns its `WhatsAppSender`**
- Use case is a pure router: match by `regex`, call `command.execute()`, return `void`
- Each command is self-contained; `WhatsAppSender` appears in each command's constructor

**Option B — Commands return a `CommandResult` discriminated union; use case sends**
- Commands have zero I/O dependency — pure fetch+format
- All WhatsApp sends centralised in the use case
- Smell: complex return type `{ kind: 'text' } | { kind: 'document', pdf, filename }` — notebook's compound send (text then PDF) is implicit inside `kind: 'document'`

**Channel pattern — use case passes a bound `WhatsAppChannel` into `execute()`**
- Commands call `channel.text()` or `channel.document()` — no constructor dependency on sender
- `channel.document()` encodes notebook-specific compound behaviour (send text then PDF) into the shared abstraction — the compound send belongs in the notebook command, not the channel

## Decision

**Option A.** The `WhatsAppCommand` interface:

```ts
export interface WhatsAppCommand {
  readonly trigger: RegExp;  // broad — "is this command for me?"
  readonly usage: string;    // shown in unknown-command reply
  execute(phone, conversationId, text): ResultAsync<void, ServiceUnavailableError>;
}
```

`handle-message.ts` accepts `commands: WhatsAppCommand[]`. The `trigger`/`usage` split mirrors HTTP request validation: the router matches the route (`trigger`) and shows the `usage` hint when no trigger matches. Each command owns its own strict input validation as a private `pattern` regex — this is not part of the shared interface.

Each command class declares `WhatsAppSender` as a constructor dependency and owns its complete execution — including notebook's compound send (text then PDF). The compound send is specific to the notebook command; encoding it in a shared abstraction would be a leaky generalisation.

The handler (`handle-message.ts`) retains `WhatsAppSender` for the three non-command paths: new-phone greeting, tutor reply, and unknown-command reply.

## Consequences

- Session handling was later extracted into `StartOrResumeConversationUseCase`; routing moved fully into `handle-message.ts` (adapter layer). `HandleWhatsAppMessageUseCase` no longer exists.
- Adding a new command requires only a new class wired in `index.ts` — zero changes to the use case
- Use case tests use generic `mockCommandA` / `mockCommandB` objects; they test routing behaviour, not command-specific logic
- Command tests are isolated: each command's error paths, regex boundaries, and sending logic tested independently
- `WhatsAppSender` appears in every command constructor — accepted trade-off; actual sending logic lives in `MetaWhatsAppClient`, so cross-cutting concerns (retry, rate-limiting) are added there, not scattered across commands
