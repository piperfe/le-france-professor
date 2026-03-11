# Quick Start Guide

## Prerequisites

- Node.js 18+ and npm
- Ollama installed and running

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configure environment variables:**

   Create `backend/.env`:
   ```
   PORT=3001
   NODE_ENV=development
   OLLAMA_MODEL=gemma3:4b
   OLLAMA_BASE_URL=http://localhost:11434/v1
   ```
   Ensure Ollama is running and the model is pulled: `ollama pull gemma3:4b`

   **Model recommendations by available RAM:**

   | RAM | Recommended model | Pull command |
   |-----|-------------------|--------------|
   | 8 GB | `gemma3:4b` (default) | `ollama pull gemma3:4b` |
   | 16 GB | `mistral-nemo` | `ollama pull mistral-nemo` |
   | 32 GB | `mistral-small3.2` | `ollama pull mistral-small3.2` |

   > **Why not EuroLLM?** EuroLLM-9B-Instruct was trained with SFT only (no RLHF/DPO alignment). It repeats itself, confuses roles, and ignores system prompt constraints — not suitable for conversational tutoring. `gemma3:4b` is RLHF-aligned and follows instructions reliably on 8 GB machines.

   Create `frontend/.env.local` (optional — defaults shown):
   ```
   BACKEND_URL=http://localhost:3001/api
   WHISPER_URL=http://127.0.0.1:7600
   PIPER_URL=http://127.0.0.1:7602
   ```

   `WHISPER_URL` points to a running [whisper.cpp server](https://github.com/ggml-org/whisper.cpp/tree/master/examples/server). Voice input is disabled gracefully in browsers that don't support `MediaRecorder`. If the whisper.cpp server is not running, transcription requests will return 503 and the UI will show a retry prompt.

   **Starting whisper.cpp server (macOS):**
   ```bash
   # From your whisper.cpp directory — use a multilingual model (no .en suffix)
   # Download if needed: bash models/download-ggml-model.sh small
   ./build/bin/whisper-server --model models/ggml-small.bin --host 127.0.0.1 --port 7600
   ```

   > **Model must be multilingual** — models ending in `.en` (e.g. `ggml-small.en.bin`) ignore the `language=fr` parameter and always transcribe in English. Use the plain variant (`ggml-small.bin`, `ggml-base.bin`, etc.).
   >
   > Audio conversion is handled automatically: the BFF route converts WebM/Opus (Chrome), MP4/AAC (Safari), and OGG/Opus (Firefox) to 16kHz mono WAV using ffmpeg before sending to whisper.cpp.

   `PIPER_URL` points to a running [piper1-gpl](https://github.com/OHF-Voice/piper1-gpl) TTS server. If the server is not running, TTS buttons are still shown but requests return 503 and the UI silently stays idle (TTS is a supplementary feature).

   **Starting piper1-gpl server (macOS):**
   ```bash
   # First-time setup — from /Users/<you>/WorkSpace/piper-tts/
   python3 -m venv venv
   source venv/bin/activate
   # Apple Silicon:
   pip install "https://github.com/OHF-Voice/piper1-gpl/releases/download/v1.4.1/piper_tts-1.4.1-cp39-abi3-macosx_11_0_arm64.whl"
   # Intel Mac:
   pip install "https://github.com/OHF-Voice/piper1-gpl/releases/download/v1.4.1/piper_tts-1.4.1-cp39-abi3-macosx_10_9_x86_64.whl"
   pip install flask
   curl -L -o models/fr_FR-upmc-medium.onnx \
     "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx"
   curl -L -o models/fr_FR-upmc-medium.onnx.json \
     "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx.json"

   # Daily startup
   cd /Users/<you>/WorkSpace/piper-tts && source venv/bin/activate
   python3 -m piper.http_server -m fr_FR-upmc-medium --data-dir ./models --port 7602
   ```

   > **Voice:** `fr_FR-upmc-medium` (Jessica) — Parisian French female, UPMC corpus. Speed is controlled server-side via `length_scale` (1.0 = normal, 1.5 = slow) so the turtle button produces genuinely slower phoneme duration rather than browser-stretched audio.
   >
   > **Test the server:** `curl -s -X POST http://127.0.0.1:7602/ -H "Content-Type: application/json" -d '{"text":"Bonjour !"}' -o /tmp/test.wav && open /tmp/test.wav`

3. **Run the application:**

   In separate terminals:
   ```bash
   # Terminal 1 - Backend
   npm run dev:backend

   # Terminal 2 - Frontend
   npm run dev:frontend
   ```

   > **Why `--webpack` instead of Turbopack?**
   > Next.js 16 enables Turbopack by default for `next dev`. We intentionally use `--webpack` because Turbopack has a confirmed memory leak in dev mode (Vercel issues [#66326](https://github.com/vercel/next.js/issues/66326), [#75142](https://github.com/vercel/next.js/issues/75142), [#82512](https://github.com/vercel/next.js/discussions/82512)) where it accumulates its full module graph in the V8 heap, growing to 6+ GB and eventually crashing with an OOM error. With Webpack the dev server stabilises at ~500 MB. Re-evaluate when Vercel ships a fix.

4. **Run tests:**
   ```bash
   # Backend (unit + integration)
   npm run test:backend

   # Frontend (unit + integration + component)
   npm run test:frontend

   # All at once
   npm run test:all

   # Frontend E2E (Playwright — no Ollama required)
   cd frontend && npm run test:e2e
   ```

   The E2E suite starts a stub backend on port 3001 and a production Next.js server on port 3000 automatically. If those ports are already in use it will reuse the running servers.

## Observability

Add to `backend/.env` to enable tracing:

```
# console (default) — prints spans as JSON to stdout
# otlp             — sends to the local Grafana stack (Tempo + Loki)
OTEL_TRACES_EXPORTER=otlp

# Capture full LLM prompt and response text as log records
OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true
```

To run the local Grafana stack (Tempo + Loki + Grafana):
```bash
cd observability
docker compose up -d
```

Then open `http://localhost:3100` — no login required.

See [OBSERVABILITY.md](./OBSERVABILITY.md) for the full trace hierarchy, exporter options, and how to add spans to new classes.

## API Documentation

Interactive API docs are served by the backend via [Scalar](https://scalar.com):

```
http://localhost:3001/docs
```

The UI includes request/response schemas, examples, and a built-in HTTP client to test endpoints directly in the browser. The OpenAPI spec source is at `backend/src/adapters/http/openapi-spec.ts`.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/conversations` | Create a new conversation |
| `POST` | `/api/conversations/:conversationId/messages` | Send a message to the tutor |
| `GET`  | `/api/conversations/:conversationId` | Get conversation details |
