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
   OLLAMA_MODEL=hf.co/QuantFactory/EuroLLM-9B-Instruct-GGUF
   OLLAMA_BASE_URL=http://localhost:11434/v1
   ```
   Ensure Ollama is running and the model is pulled: `ollama run hf.co/QuantFactory/EuroLLM-9B-Instruct-GGUF`

   Create `frontend/.env.local` (optional — defaults to `http://localhost:3001/api`):
   ```
   BACKEND_URL=http://localhost:3001/api
   ```

3. **Run the application:**

   In separate terminals:
   ```bash
   # Terminal 1 - Backend
   npm run dev:backend

   # Terminal 2 - Frontend
   npm run dev:frontend
   ```

4. **Run tests:**
   ```bash
   npm run test:backend
   npm run test:frontend
   npm run test:all
   ```

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
