# ADR-0025: Design mockups in HTML before any implementation

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🎨 UX Decisions |
| Date | 2026-03-14 |

## Context

A UX/UI redesign was proposed. The risk: implementing the wrong design then having to rewrite. The question: should we code the UI directly or validate visually first?

## Decision

Build static HTML mockups (openable in browser) before touching any production code. Only implement after the design is approved from the mockups.

## Consequences

- Mockups live in design/ (not tracked by git) — design/mockup-welcome.html, design/mockup-conversation.html.
- Figma file is the canonical design source: used for iteration, HTML mockups are for pre-implementation validation.
- design/ folder contents are ephemeral — only the generated docs/preview.png (README screenshot) is committed.

## Source Conversation

> **Mar 14 — Saturday — 15:08**
>
> **You:** can we draw the final pages/sections ... before the implementation ???
