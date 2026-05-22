# ADR-0038: Per-command formatter ports — behavioral contracts, not data DTOs

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🏗️ System Architecture |
| Date | 2026-05-22 |

## Context

### The smell

After the command-routing refactor (ADR-0035), each WhatsApp command handler owned its sending logic — but message formatting was scattered. `/notebook` produced rich WhatsApp-formatted strings (emoji headers, `*bold*` words, `_italic_` dates, bullet lists). `/vocabulary` and the unknown-command reply returned plain strings hardcoded directly inside the handler methods. The result was an inconsistent user experience: one command felt designed, the others felt like debug output.

```
/notebook reply:   📖 *Vocabulaire* 🇫🇷 — 4 mots au total …   ← styled
/vocabulary reply: Bonjour: salutation courante.               ← plain
unknown command:   Commande inconnue. /vocabulary · /notebook  ← plain
```

### Why not a shared formatting bus

The first instinct was a shared `WhatsAppMessageFormatter` that all commands would route through — a "DTO bus" where commands return a structured `MessageDTO { text, attachments }` and one central formatter renders it. This was rejected for three reasons:

1. **Commands are not homogeneous.** `/notebook` sends text then a PDF document; `/vocabulary` sends a single text bubble. A shared DTO needs to encode all possible shapes, becoming a union type that grows with every new command.
2. **Indirection without benefit.** The DTO layer adds a seam between "what the command produces" and "what the user sees" without any caller that needs to consume both uniformly. There is no cross-command rendering pipeline; each command sends independently.
3. **Existing `NotebookFormatter` was already behavioral.** It was already an interface with methods that return strings and `Promise<Buffer>` — not a data structure. Inventing a DTO wrapper would have been a regression.

### The established pattern: behavioral contract ports

A behavioral contract interface is one whose methods describe **what the collaborator does**, not **what data it holds**:

```ts
// Behavioral contract — methods produce output
export interface VocabularyFormatter {
  formatReply(word: string, explanation: string): string;
  formatMissingWord(): string;
}

// Data DTO — not this
export interface VocabularyMessageDTO {
  emoji: string;
  word: string;
  explanation: string;
}
```

`NotebookFormatter` was already following this pattern. The question was whether to extend it to every command or leave `/vocabulary` formatting inline. The answer surfaced clearly once the user placed both a `/vocabulary` reply and a `/notebook` entry side by side: the vocabulary reply **is** a notebook entry. They should share the same visual grammar.

## Decision

Every WhatsApp command gets its own formatter port — a behavioral contract interface whose methods produce platform-specific message strings, injected at command construction time.

1. **One formatter port per command**, owned in `adapters/whatsapp/ports/` per ADR-0037:
   - `ports/vocabulary-formatter.ts` — `formatReply(word, explanation)` + `formatMissingWord()`
   - `ports/notebook-formatter.ts` — `formatReply(entries, showAll)` + `formatInvalidUsage()` + `generatePdf(entries)`

2. **One formatter implementation per command**, in `adapters/whatsapp/formatters/`:
   - `formatters/vocabulary-formatter.ts` — `WhatsAppVocabularyFormatter`
   - `formatters/notebook-formatter.ts` — `WhatsAppNotebookFormatter`

3. **Commands receive the formatter at construction time** — injected via the constructor, not imported directly. The command depends on the port (interface), not the concrete class.

4. **`formatUnknownCommand` is not a port** — it is a pure private function in `handle-message.ts`. It has no per-command variant, no test isolation need, and no implementation to swap. Making it a port would be premature abstraction.

## Consequences

- Each command is fully self-contained: `trigger` regex + `pattern` regex + formatter port + sender port. Adding a new command requires only a new port + implementation + handler; zero changes to the router or existing commands.
- Formatter implementations are independently testable. Each gets its own unit test file with a three-tier structure: golden-path snapshot → content correctness → format markers. See `formatters/notebook-formatter.test.ts` and `formatters/vocabulary-formatter.test.ts`.
- The `formatters/` directory is outbound-only: it produces strings and buffers for delivery. It has no use case imports, no repository access, no domain mutation.
- `NotebookFormatter.formatInvalidUsage()` was added to move the hardcoded `'Usage : /notebook · /notebook all'` string from inside `NotebookCommand` into the formatter — consistent with how `VocabularyFormatter.formatMissingWord()` and `handle-message.ts#formatUnknownCommand` handle their equivalent paths.
- Visual grammar is now uniform across all responses: `📚`/`📖` emoji opener, `*bold*` for key words and labels, `_italic_` for metadata, `• bullet` lists for usage examples.
