# ADR-0026: Vocabulary: notebook drawer not inline popover

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🎨 UX Decisions |
| Date | 2026-03-15 |

## Context

The vocabulary feature needed a UX for showing word explanations. Two approaches were considered: an inline popover appearing next to the highlighted word in the chat, or a persistent drawer/notebook sliding in from the side.

## Decision

Use a notebook drawer that slides in from the right. Clicking a highlighted word opens the drawer with that word visually remarked inside it. No inline popover.

## Consequences

- The drawer is persistent — vocabulary entries accumulate across the conversation.
- Clicking a highlighted word navigates to that entry inside the already-open drawer.
- VocabularyNotebook component is controlled — open/highlight state managed by useVocabularyNotebook hook.
- The inline popover approach was explicitly rejected — drawer gives more space and better mobile UX.

## Source Conversation

> **Mar 15 — Sunday — 12:27**
>
> **You:** 2. we took a decission, about the drawer instead of inline popover
