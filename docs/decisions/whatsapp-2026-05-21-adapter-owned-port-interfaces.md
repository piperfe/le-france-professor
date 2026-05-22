# ADR-0037: Adapter-owned port interfaces — `adapters/whatsapp/ports/`

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🏗️ System Architecture |
| Date | 2026-05-21 |

## Context

### The smell

`WhatsAppSender`, `MediaDownloader`, `AudioTranscriber`, and `NotebookFormatter` were placed in `domain/services/` — the conventional home for outbound port interfaces in hexagonal architecture. But after the command-routing refactor (ADR-0035, ADR-0036), a structural smell surfaced: **none of these interfaces is consumed by any use case or domain entity**. They are exclusively used by the adapter layer:

- `WhatsAppSender` — called by command handlers and `handle-message.ts` to send replies
- `MediaDownloader` — called by `WhatsAppVoiceTranscriber` to fetch audio from Meta
- `AudioTranscriber` — called by `WhatsAppVoiceTranscriber` to transcribe via whisper.cpp
- `NotebookFormatter` — called by `NotebookCommand` to format text and generate PDFs

The adapter layer was reaching directly into `domain/services/` to get contracts for calling infrastructure — bypassing the application layer entirely. Asking the question plainly: *is this a use case or a use case created just to satisfy hexagonal boundaries?*

### Why this violated the architecture

In this project, the established pattern for reaching infrastructure is:

```
Adapter → Application use case → Domain interface ← Infrastructure
```

Every domain interface that exists (repositories, LLM services) is consumed by a **use case**, which is the actual owner of the business workflow. The adapter only knows the use case — it does not reach domain interfaces directly.

The four interfaces in question broke this: no use case consumed them. The actual flow was:

```
Adapter → Domain interface ← Infrastructure   (no use case in between)
```

Putting them in `domain/` just to satisfy the eslint-plugin-boundaries rule (`adapters → domain ✅`) was an artificial constraint — not a reflection of where the dependency actually lived semantically.

### The hexagonal principle

The hexagonal rule is: **ports belong to the layer that depends on them, not the layer that implements them.**

- Repositories (`ConversationRepository`, `VocabularyRepository`) belong in `domain/` because **use cases** depend on them.
- `WhatsAppSender`, `MediaDownloader`, `AudioTranscriber`, `NotebookFormatter` belong in `adapters/whatsapp/` because **the WhatsApp adapter** depends on them — no one else.

Placing adapter-specific contracts in `domain/` was polluting the domain with infrastructure concerns. The domain layer is supposed to contain pure business concepts — entities, business rules, and interfaces that represent business capabilities (tutoring, vocabulary explanation). Sending a WhatsApp message is not a business capability; it is a delivery mechanism.

### The infrastructure boundary problem

Moving the interfaces to `adapters/whatsapp/ports/` created a secondary question: infrastructure classes (`MetaWhatsAppClient`, `MetaMediaDownloader`, `WhisperTranscriptionService`) explicitly declared `implements WhatsAppSender`, `implements MediaDownloader`, etc. Moving the interfaces would require an `infrastructure → adapters` import — which `eslint-plugin-boundaries` explicitly disallows:

```
infrastructure → domain ✅
infrastructure → application ✅
infrastructure → adapters ✗ (not in the allow list)
```

This is correct: infrastructure should not know which adapter will use it. `MetaWhatsAppClient` is a general Meta API client; it should not be coupled to the WhatsApp adapter's port definition.

### The resolution: structural typing

TypeScript's structural (duck) typing resolves this without circular coupling. A class does not need to declare `implements SomeInterface` to satisfy it — it only needs the right shape. The type compatibility check happens at the **DI wiring site** in `index.ts` (the composition root, which is allowed to import any layer):

```ts
// index.ts — shape compatibility verified here implicitly
const whatsAppSender = new MetaWhatsAppClient(token, phoneNumberId);
// TypeScript checks: does MetaWhatsAppClient satisfy WhatsAppSender? Yes → compiles.
new VocabularyCommand(explainVocabulary, whatsAppSender)
//                                       ↑ WhatsAppSender expected
```

If `MetaWhatsAppClient` ever diverges from the `WhatsAppSender` interface, TypeScript catches it at this call site — not silently at runtime.

### `HandleWhatsAppVoiceUseCase` — a use case in name only

The same smell applied to `HandleWhatsAppVoiceUseCase`: download audio from Meta, convert OGG→WAV, call whisper. This is I/O transformation with zero domain logic — structurally identical to HTTP request body parsing. Naming it a "use case" and placing it in `application/use-cases/` gave it false authority. It was a WhatsApp adapter pipeline from the start.

## Decision

1. **Port interfaces move to `adapters/whatsapp/ports/`** — the layer that depends on them:
   - `adapters/whatsapp/ports/whatsapp-sender.ts`
   - `adapters/whatsapp/ports/media-downloader.ts`
   - `adapters/whatsapp/ports/audio-transcriber.ts`
   - `adapters/whatsapp/ports/notebook-formatter.ts`

2. **`HandleWhatsAppVoiceUseCase` moves to `adapters/whatsapp/voice-transcriber.ts`** (renamed `WhatsAppVoiceTranscriber`). The `execute` method is renamed `transcribe` — the verb describes the observable output, not the internal steps.

3. **Infrastructure classes drop explicit `implements` clauses** for these interfaces. Shape compatibility is verified structurally at the DI wiring site in `index.ts`.

## Consequences

- `domain/services/` contains only interfaces consumed by use cases (`TutorService`, `VocabularyService`, `TitleService`). No WhatsApp-specific concept remains in the domain.
- `adapters/whatsapp/ports/` is the single location for all contracts the WhatsApp adapter needs from the outside world. The boundary is legible: open `ports/`, see exactly what the adapter depends on.
- Infrastructure classes carry no import from the adapter layer. Any shape mismatch fails at the `index.ts` call site — caught by TypeScript, not at runtime.
- `application/use-cases/` contains only channel-agnostic orchestration — `WhatsAppVoiceTranscriber` is not a use case.
- The `eslint-plugin-boundaries` rule `adapters → adapters ✅` makes `adapters/whatsapp/handlers/` importing from `adapters/whatsapp/ports/` valid without any config change.
- The rule that emerges: **if no use case consumes an interface, it does not belong in `domain/` or `application/`**. Find the layer that depends on it and put it there.
