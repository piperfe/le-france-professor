# ADR-0005: Tailwind CSS for all frontend styling

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | ⚛️ Frontend Patterns |
| Date | 2026-03-04 |

## Context

The initial frontend was built without a styling framework. The question arose during the move to Next.js.

## Decision

Use Tailwind CSS throughout the frontend. No custom CSS files, no CSS-in-JS. All styling via Tailwind utility classes.

## Consequences

- tailwind.config.ts defines the design token boundaries — colors, spacing, typography.
- No className conflicts across components — all styles are co-located in JSX.
- Design system tokens map to Tailwind custom values when the project introduces a design language.

## Source Conversation

> **Mar 4 — Wednesday — 18:04**
>
> **You:** can we use tailwind css ? instead ?
