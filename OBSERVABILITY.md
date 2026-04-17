# Observability

The backend is instrumented with [OpenTelemetry](https://opentelemetry.io/) and emits **traces** for every request, use-case execution, and LLM call.

## What is traced

| What | How | Files |
|---|---|---|
| Incoming HTTP requests | auto-instrumented | `instrumentation-express`, `instrumentation-http` |
| Use cases | `withTracing()` proxy at composition root | `infrastructure/telemetry/tracing-proxy.ts`, `src/index.ts` |
| Infrastructure services (LLM, WhatsApp, repositories) | `@Span()` decorator | `infrastructure/telemetry/decorators.ts`, `infrastructure/llm/ollama-*.ts`, `infrastructure/whatsapp/meta-whatsapp-client.ts`, `infrastructure/whatsapp/meta-media-downloader.ts`, `infrastructure/whatsapp/whisper-transcription-service.ts`, `infrastructure/repositories/sqlite-*.ts` |
| LLM calls | auto-instrumented with `gen_ai.*` attributes | `instrumentation-openai` |
| Outgoing HTTP (fetch) | auto-instrumented | `instrumentation-undici` |

### Example trace — send message

```
HTTP POST /api/conversations/:id/messages            ← auto (Express)
  └─ SendMessageUseCase.execute                      ← withTracing() proxy
        ├─ SqliteConversationRepository.findById     ← @Span() decorator
        ├─ OllamaTutorService.generateResponse       ← @Span() decorator
        │     └─ chat openai                         ← auto (openai SDK)
        │           gen_ai.request.model        = "hf.co/..."
        │           gen_ai.request.temperature  = 0.7
        │           gen_ai.request.max_tokens   = 120
        │           gen_ai.usage.input_tokens   = …
        │           gen_ai.usage.output_tokens  = …
        ├─ SqliteConversationRepository.save         ← @Span() decorator
        ├─ GenerateTitleUseCase.execute              ← withTracing() — fire-and-forget after 2nd student message
        │     ├─ SqliteConversationRepository.findById ← @Span() decorator
        │     ├─ OllamaTitleService.generateTitle    ← @Span() decorator
        │     │     └─ chat openai                   ← auto (openai SDK)
        │     └─ SqliteConversationRepository.save   ← @Span() decorator
        └─ ExtractTopicUseCase.execute               ← withTracing() — fire-and-forget after 4th student message
              ├─ SqliteConversationRepository.findById ← @Span() decorator
              ├─ OllamaTutorService.extractTopic     ← @Span() decorator
              │     └─ chat openai                   ← auto (openai SDK)
              └─ SqliteConversationRepository.save   ← @Span() decorator
```

Errors are automatically captured as span **exception events** with a full stack trace and the span status is set to `ERROR`. Both `withTracing()` and `@Span()` handle thrown exceptions and neverthrow `Result.Err` returns — no extra code needed in error handlers.

## Selecting an exporter

The exporter is controlled by the `OTEL_TRACES_EXPORTER` env var in `backend/.env`:

| Value | Exporter | When to use |
|---|---|---|
| *(unset)* or `console` | `ConsoleSpanExporter` | Default — prints spans as JSON to stdout |
| `otlp` | `OTLPTraceExporter` | Sends spans to Grafana Tempo or any OTLP-compatible backend |

When using `otlp`, the endpoint defaults to `http://localhost:4318/v1/traces`. Override it with:
```
OTEL_EXPORTER_OTLP_ENDPOINT=http://your-collector:4318
```

---

## Console exporter

When `OTEL_TRACES_EXPORTER` is unset or set to `console`, finished spans are printed to **stdout** as JSON. Look for these fields:

| Field | Description |
|---|---|
| `name` | Span name (`SendMessageUseCase.execute`, `chat openai`, …) |
| `traceId` | Groups all spans from the same request |
| `parentId` | Links a child span to its parent |
| `status` | `{ code: 0 }` = OK, `{ code: 2 }` = ERROR |
| `events` | Exception events with `exception.message` and stack trace |
| `attributes` | `gen_ai.*` attributes on LLM spans |

To also capture the full **prompt and response text** as span events set this in `backend/.env`:

```
OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true
```

## OTLP exporter — Grafana stack (Tempo + Loki)

Set `OTEL_TRACES_EXPORTER=otlp` in `backend/.env` to send traces and logs over OTLP to the local observability stack.

### Start the stack

```bash
cd observability
docker compose up -d
```

This starts four services:

| Service | Role | Internal port |
|---|---|---|
| `otel-collector` | Receives OTLP from the backend, routes to Tempo and Loki | `4318` (exposed to host) |
| `tempo` | Stores and serves traces | internal only |
| `loki` | Stores and serves logs | internal only |
| `grafana` | UI for traces and logs | `3100` (exposed to host) |

### Configure the backend

```
# backend/.env
OTEL_TRACES_EXPORTER=otlp
OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true
```

### View traces and logs

Open `http://localhost:3100` (no login required).

- **Traces** → Explore → Tempo → search by service `le-france-professor`
- **Logs** → Explore → Loki → query `{service_name="le-france-professor"}`
- **Trace → Logs** → click any trace in Tempo, then click "Logs for this span" to jump directly to the correlated LLM prompt/response log records

### Stop the stack

```bash
cd observability
docker compose down
```

Data is not persisted — traces and logs are lost on shutdown.

## Adding spans to new code

Two mechanisms are in use — choose based on the layer:

### Use cases → `withTracing()` at the composition root

New use cases get tracing for free — `withTracing()` is applied to every use case in `src/index.ts`. No import needed in the use case itself.

```ts
// src/index.ts
const myUseCase = withTracing(new MyUseCase(repository));
```

### Infrastructure services → `@Span()` decorator

For service methods that call external I/O (LLM, HTTP), apply `@Span()` directly. Handles both `async` (throws) and `ResultAsync` (neverthrow) return types:

```ts
import { Span } from '../telemetry/decorators';

class MyService {
  @Span()
  async call(): Promise<string> {
    // thrown errors → span marked ERROR + exception recorded
  }

  @Span()
  query(): ResultAsync<string, ServiceUnavailableError> {
    // Err results → span marked ERROR + exception recorded
  }
}
```

In both cases the span status is set to `ERROR` automatically on failure. A successful result leaves the status as `OK`.

### Content logs → `logInfo()` helper

When a service produces **content** (variable-length text output from an AI model — not metadata), emit it as an OTel log record so it lands in Loki correlated to the active span. Do not use span attributes for content — they are size-limited and indexed.

Use the shared `logInfo()` helper from `infrastructure/telemetry/logger.ts`:

```ts
import { logInfo } from '../telemetry/logger';

// Inside a @Span()-decorated method, while the span is active:
if (process.env.OTEL_WHATSAPP_CAPTURE_TRANSCRIPTION === 'true') {
  logInfo(transcription, { 'event.name': 'whatsapp.transcription' });
}
```

`logInfo()` handles:
- **Format** — body is wrapped as `{"content": "..."}`, matching the LLM log convention so both are queryable the same way in Loki (`| json | line_format "{{.content}}"`)
- **Severity** — `INFO` / `SeverityNumber.INFO`
- **Correlation** — the OTel SDK automatically injects `traceId` and `spanId` from the active span context into the log record

The pattern mirrors `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT` for LLM content — each content type has its own env var gate, but all records share the same format and correlation mechanism. See `WhisperTranscriptionService.transcribe()` for a reference implementation.

To enable content capture, set in `backend/.env`:

| Content type | Env var |
|---|---|
| LLM prompt / response | `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true` |
| WhatsApp voice transcription | `OTEL_WHATSAPP_CAPTURE_TRANSCRIPTION=true` |

---

## Architecture Decisions

The decisions that shaped the observability setup are recorded in [`docs/decisions/`](./docs/decisions/):

| ADR | Decision |
|-----|----------|
| [ADR-0016](./docs/decisions/observability-2026-02-26-span-decorator-tracing.md) | `@Span()` decorator — tracing without polluting business logic |
| [ADR-0017](./docs/decisions/observability-2026-02-26-dual-exporter-console-or-otlp.md) | Dual exporter — console (default) or OTLP via env var |
| [ADR-0018](./docs/decisions/observability-2026-02-26-llm-content-as-otel-log-records.md) | AI model content as OTel log records — `logInfo()` helper, `{"content": ...}` format, env var gate per content type |
| [ADR-0015](./docs/decisions/errors-2026-03-15-fire-and-forget-void-not-match.md) | Fire-and-forget ResultAsync: use `void`, not `.match()` |
| [ADR-0030](./docs/decisions/arch-2026-04-10-whatsapp-cloud-api-webhook.md) | WhatsApp via Meta Cloud API webhook — one conversation per phone number |
