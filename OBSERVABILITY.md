# Observability

The backend is instrumented with [OpenTelemetry](https://opentelemetry.io/) and emits **traces** for every request, use-case execution, and LLM call.

## What is traced

Every incoming HTTP request produces a trace tree:

```
HTTP POST /api/conversations/:id/messages       ← auto (Express)
  └─ SendMessageUseCase.execute                 ← @Span() decorator
        └─ OllamaTutorService.generateResponse  ← @Span() decorator
              └─ chat openai                    ← auto (openai SDK)
                    gen_ai.request.model        = "hf.co/..."
                    gen_ai.request.temperature  = 0.7
                    gen_ai.request.max_tokens   = 300
                    gen_ai.usage.input_tokens   = …
                    gen_ai.usage.output_tokens  = …
```

Errors are automatically captured as span **exception events** with a full stack trace and the span status is set to `ERROR` — no extra code needed in error handlers.

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
| `grafana` | UI for traces and logs | `3000` (exposed to host) |

### Configure the backend

```
# backend/.env
OTEL_TRACES_EXPORTER=otlp
OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true
```

### View traces and logs

Open `http://localhost:3000` (no login required).

- **Traces** → Explore → Tempo → search by service `le-france-professor`
- **Logs** → Explore → Loki → query `{service_name="le-france-professor"}`
- **Trace → Logs** → click any trace in Tempo, then click "Logs for this span" to jump directly to the correlated LLM prompt/response log records

### Stop the stack

```bash
cd observability
docker compose down
```

Data is not persisted — traces and logs are lost on shutdown.

## Adding spans to new classes

Use the `@Span()` decorator — it creates a named span, records any thrown exception, and sets the span status to `ERROR` automatically:

```ts
import { Span } from '../infrastructure/telemetry/decorators';

class MyUseCase {
  @Span()                        // name defaults to "MyUseCase.execute"
  async execute(...) { ... }

  @Span('my.custom.span.name')   // explicit name
  async helper(...) { ... }
}
```
