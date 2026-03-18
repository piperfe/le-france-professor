# ADR-0022: TTS engine: piper + fr_FR-upmc-medium (Jessica) over Kokoro

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🎙️ Voice & TTS |
| Date | 2026-03-11 |

## Context

Three TTS options were benchmarked for French: Web Speech API (OS-dependent, eSpeak on Linux is unusable), Kokoro (highest quality, TTS Arena #1 but Python/large model), and piper (intelligible, fast, lightweight).

## Decision

Use piper TTS with the fr_FR-upmc-medium (Jessica, Parisian French female) voice. Kokoro was rejected for complexity — requires a large model download and slower inference. Web Speech API was rejected for consistency across platforms.

## Consequences

- Piper runs at http://127.0.0.1:7602 — started via Python venv.
- Speed is controlled server-side via length_scale (not browser playbackRate) — SLOW_LENGTH_SCALE = 1.5.
- Piper endpoint is POST / (not /synthesize) — official piper1-gpl HTTP API.
- Kokoro remains a future upgrade path if quality complaints arise.

## Source Conversation

> **Mar 11 — Wednesday — 12:45**
>
> **You:** now ... we can research about the voices (from the text) you mentioned 3 free options ... can we research the adoption ?? I do not know similarly to the wrong word error metric (from voice to text) there is some metrics an benchmarking comparing the options ... please research
