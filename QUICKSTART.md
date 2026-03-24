# Quick Start Guide

## Prerequisites

- Node.js 18+ and npm
- [Ollama](https://ollama.com/) — runs natively for GPU/Metal access
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — only if using Option A for whisper/piper

## 1. Install dependencies

```bash
npm install
```

## 2. Configure the LLM

Create `backend/.env`:
```
PORT=3001
NODE_ENV=development
OLLAMA_MODEL=gemma3:4b
OLLAMA_BASE_URL=http://localhost:11434/v1
```

Pull the model:
```bash
ollama pull gemma3:4b
```

**Model recommendations by available RAM:**

| RAM | Recommended model | Pull command |
|-----|-------------------|--------------|
| 8 GB | `gemma3:4b` (default) | `ollama pull gemma3:4b` |
| 16 GB | `mistral-nemo` | `ollama pull mistral-nemo` |
| 32 GB | `mistral-small3.2` | `ollama pull mistral-small3.2` |

> **Why not EuroLLM?** EuroLLM-9B-Instruct was trained with SFT only (no RLHF/DPO alignment). It repeats itself, confuses roles, and ignores system prompt constraints — not suitable for conversational tutoring. `gemma3:4b` is RLHF-aligned and follows instructions reliably on 8 GB machines. → [ADR-0019](./docs/decisions/llm-2026-03-09-model-gemma3-4b-eurollm-banned.md)

## 3. Start whisper.cpp and piper TTS

Voice input and TTS are optional features — the app works without them. If either service is not running, the UI degrades gracefully (503 → retry prompt for voice, silent idle for TTS).

### Option A — Docker (recommended for new contributors)

```bash
# Download models once (~310 MB total)
npm run models:download

# Start whisper (port 7600) and piper (port 7602) in the background
docker compose up -d
```

The first `docker compose up` compiles whisper.cpp from source — takes a few minutes but is fully cached afterwards.

### Option B — Native (macOS)

**whisper.cpp:**
```bash
# From your whisper.cpp directory — use a multilingual model (no .en suffix)
# Download if needed: bash models/download-ggml-model.sh small
./build/bin/whisper-server --model models/ggml-small.bin --host 127.0.0.1 --port 7600
```

**piper TTS:**
```bash
# First-time setup
python3 -m venv venv && source venv/bin/activate
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
source venv/bin/activate
python3 -m piper.http_server -m fr_FR-upmc-medium --data-dir ./models --port 7602
```

> **whisper model must be multilingual** — models ending in `.en` ignore the `language=fr` parameter and always transcribe in English. Use the plain variant (`ggml-small.bin`, `ggml-base.bin`, etc.). → [ADR-0021](./docs/decisions/voice-2026-03-06-stt-whisper-cpp-local.md)
>
> **Audio conversion** is handled automatically by the BFF: WebM/Opus (Chrome), MP4/AAC (Safari), and OGG/Opus (Firefox) are converted to 16kHz mono WAV using ffmpeg before sending to whisper.cpp. → [ADR-0023](./docs/decisions/voice-2026-03-06-webm-wav-conversion-in-bff.md)
>
> **piper voice:** `fr_FR-upmc-medium` (Jessica) — Parisian French female, UPMC corpus. Speed is controlled server-side via `length_scale` (1.0 = normal, 1.5 = slow). → [ADR-0022](./docs/decisions/voice-2026-03-11-tts-piper-upmc-medium-jessica.md)
>
> **Test piper:** `curl -s -X POST http://127.0.0.1:7602/ -H "Content-Type: application/json" -d '{"text":"Bonjour !"}' -o /tmp/test.wav && open /tmp/test.wav`

## 4. (Optional) Start observability stack

Grafana + Tempo + Loki + OpenTelemetry collector for local traces and logs:

```bash
docker compose -f observability/docker-compose.yaml up -d
```

Grafana is at [http://localhost:3100](http://localhost:3100). See [OBSERVABILITY.md](./OBSERVABILITY.md) for dashboard setup, adding spans, and exporter configuration.

## 5. Start the app

```bash
npm run dev
```

Starts backend (port 3001) and frontend (port 3000) in a single terminal with colour-coded output.

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

`frontend/.env.local` (optional — defaults shown):
```
BACKEND_URL=http://localhost:3001/api
WHISPER_URL=http://127.0.0.1:7600
PIPER_URL=http://127.0.0.1:7602
```

The default ports match both Docker and native setups — no changes needed unless you have a port conflict.

## Run tests

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

The E2E suite starts a stub backend on port 5101 and a production Next.js server on port 5100 automatically. If those ports are already in use it will reuse the running servers.

## Notes

> **Why `--webpack` instead of Turbopack?**
> Next.js 16 enables Turbopack by default for `next dev`. We intentionally use `--webpack` because Turbopack has a confirmed memory leak in dev mode (Vercel issues [#66326](https://github.com/vercel/next.js/issues/66326), [#75142](https://github.com/vercel/next.js/issues/75142), [#82512](https://github.com/vercel/next.js/discussions/82512)) where it accumulates its full module graph in the V8 heap, growing to 6+ GB and eventually crashing with an OOM error. With Webpack the dev server stabilises at ~500 MB. Re-evaluate when Vercel ships a fix.

## Further reading

- [OBSERVABILITY.md](./OBSERVABILITY.md) — OpenTelemetry traces, exporter options, Grafana stack, adding spans
- [TESTING.md](./TESTING.md) — Testing strategy, conventions, commands for each layer
- API docs — interactive docs at `http://localhost:3001/docs` once the backend is running
