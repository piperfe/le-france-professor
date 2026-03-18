# ADR-0021: STT engine: whisper.cpp (local) over Web Speech API

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🎙️ Voice & TTS |
| Date | 2026-03-06 |

## Context

Five STT options were evaluated: Web Speech API (browser-native), Whisper.cpp (local), OpenAI Whisper API, Deepgram, and AssemblyAI. Key constraints: French accuracy, privacy, and no per-request cost.

## Decision

Use whisper.cpp running locally as the STT engine. Web Speech API was rejected: sends audio to Google/Apple servers (GDPR concern for a French school context), Firefox has no support, and accuracy is platform-dependent.

## Consequences

- Model must be multilingual — ggml-small.bin not ggml-small.en.bin.
- Runs at http://127.0.0.1:7600 — must be started manually before dev session.
- French accuracy significantly better than Web Speech API on non-Apple hardware.
- No per-request cost — runs entirely offline.

## Source Conversation

> **Mar 6 — Friday — 14:19**
>
> **You:** 1. Can we open up ... and research a bit when we're doing the card ??? you put some options ?? any opensource stuff with similar levels of accuracy ?? we can measure the accuracy of the model ?? there are some beanchmarks ?
