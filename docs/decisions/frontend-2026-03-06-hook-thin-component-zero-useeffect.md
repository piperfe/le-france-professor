# ADR-0006: Hook + thin component — zero useEffect

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | ⚛️ Frontend Patterns |
| Date | 2026-03-06 |

## Context

useEffect couples UI to side effects reactively, making components hard to test and reason about. The question arose when introducing VoiceInputButton: should behaviour live in the component or a hook?

## Decision

All behaviour lives in a use-*.ts hook. The component is a thin JSX wrapper with no useEffect. State changes are triggered by user events — not by watching props or other state.

## Consequences

- use-tts.ts + TtsButton, use-voice-input.ts + VoiceInputButton, use-vocabulary-notebook.ts + VocabularyNotebook.
- scrollIntoView uses a ref callback (fires on node mount) — never useEffect.
- Hooks are testable without a React renderer.

## Source Conversation

> **Mar 6 — Friday — 17:46**
>
> **You:** why is a hook ??? is it nor part of a react component ??? where the use cases are ?? you proposed a hook ... there is another approuches ?
