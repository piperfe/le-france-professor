# ADR-0024: TTS module-level singleton — one audio stream at a time

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🎙️ Voice & TTS |
| Date | 2026-03-11 |

## Context

Multiple TtsButton instances can exist on the same page (one per tutor message). React component state cannot coordinate across instances.

## Decision

useTts hook uses module-level variables (activeAudio, activeObjectUrl, activeNotifyIdle) shared across all hook instances. Starting any TTS automatically stops the previous.

## Consequences

- activeNotifyIdle closure stores the previous instance's setTtsState so stopGlobal() resets the correct button UI.
- Speed state uses "normal" | "slow" | null — two modes need separate isLoading booleans.
- SLOW_LENGTH_SCALE = 1.5 passed to piper length_scale — not browser playbackRate.

## Source Conversation

> **Mar 11 — Wednesday — 13:30**
>
> **You:** can you explain me better a bit the hook ?? 'line by line'
>
> **Claude:** Sure. Module-level singleton (outside the hook): let activeAudio, let activeObjectUrl, let activeNotifyIdle. These 3 variables live outside any React component — shared across ALL TtsButton instances on the page. The problem they solve: if the student has 10 tutor messages, each with its own button, only one should play at a time. When message 2 starts, message 1 must stop.
