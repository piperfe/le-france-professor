# ADR-0023: WebM → WAV conversion in the BFF repository — not in the browser

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🎙️ Voice & TTS |
| Date | 2026-03-06 |

## Context

The browser records audio as WebM/Opus. whisper.cpp requires WAV (PCM 16kHz mono). Multiple conversion locations were considered: browser, BFF route handler, or repository.

## Decision

HttpTranscriptionRepository converts WebM → WAV server-side using ffmpeg-static + child_process.execFile before posting to whisper.cpp. Conversion is the repository's responsibility.

## Consequences

- next.config.ts must include serverExternalPackages: ["ffmpeg-static"] — webpack replaces __dirname with /ROOT otherwise.
- ffmpeg-static ships a prebuilt binary — no system-level ffmpeg dependency.
- Browser sends raw WebM — no audio processing in client code.

## Source Conversation

> **Mar 6 — Friday — 17:09**
>
> **You:** the server is whisper server listening at http://127.0.0.1:7600 and I have some audio files /Users/pipealfaro/WorkSpace/whisper.cpp/samples/jfk.wav
