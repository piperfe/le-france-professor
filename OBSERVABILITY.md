# Observability

The backend is instrumented with [OpenTelemetry](https://opentelemetry.io/) and emits **traces** for every request, use-case execution, and LLM call.

## What is traced

Every incoming request produces a trace tree. There are two entry points:

### HTTP API (frontend)

```
HTTP POST /api/conversations/:id/messages       ← auto (Express)
  └─ SendMessageUseCase.execute                 ← @Span() decorator
        └─ OllamaTutorService.generateResponse  ← @Span() decorator
        │     └─ chat openai                    ← auto (openai SDK)
        │           gen_ai.request.model        = "hf.co/..."
        │           gen_ai.request.temperature  = 0.7
        │           gen_ai.request.max_tokens   = 120
        │           gen_ai.usage.input_tokens   = …
        │           gen_ai.usage.output_tokens  = …
        ├─ GenerateTitleUseCase.execute          ← @Span() — fire-and-forget after 2nd student message
        │     └─ OllamaTitleService.generateTitle ← @Span() decorator
        │           └─ chat openai               ← auto (openai SDK)
        │                 gen_ai.request.max_tokens = 20
        └─ ExtractTopicUseCase.execute           ← @Span() — fire-and-forget after 4th student message
              └─ OllamaTutorService.extractTopic ← @Span() decorator
                    └─ chat openai               ← auto (openai SDK)
                          gen_ai.request.max_tokens = 20
```

### WhatsApp webhook (Meta Cloud API)

```
HTTP POST /api/webhook/whatsapp                         ← auto (Express)
  └─ HandleWhatsAppMessageUseCase.execute               ← @Span() decorator
        └─ SendMessageUseCase.execute                   ← @Span() decorator (existing conversation)
        │     └─ OllamaTutorService.generateResponse    ← @Span() decorator
        │     │     └─ chat openai                      ← auto (openai SDK)
        │     ├─ GenerateTitleUseCase.execute            ← @Span() fire-and-forget
        │     └─ ExtractTopicUseCase.execute             ← @Span() fire-and-forget
        └─ MetaWhatsAppClient.sendMessage               ← @Span() decorator
              └─ POST graph.facebook.com/v25.0/…        ← auto (undici — native fetch)
```

One conversation is created per phone number on first contact and reused for all subsequent messages (no session reset). New conversations emit the initial greeting via `CreateConversationUseCase` before the first `SendMessageUseCase` call.

Errors are automatically captured as span **exception events** with a full stack trace and the span status is set to `ERROR`. The `@Span()` decorator handles both thrown exceptions and neverthrow `Result.Err` returns — no extra code needed in error handlers.

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

## Adding spans to new classes

Use the `@Span()` decorator — it creates a named span and sets the span status to `ERROR` automatically. It handles both error patterns used in this codebase:

**Classic async (throws):**
```ts
import { Span } from '../infrastructure/telemetry/decorators';

class MyUseCase {
  @Span()
  async execute(): Promise<Result> {
    if (!found) throw new NotFoundError('...');  // ← span marked ERROR + exception recorded
    return result;
  }
}
```

**neverthrow (returns `ResultAsync`):**
```ts
import { Span } from '../infrastructure/telemetry/decorators';

class MyUseCase {
  @Span()
  execute(): ResultAsync<Result, NotFoundError | ServiceUnavailableError> {
    return ResultAsync.fromPromise(...).andThen((value) => {
      if (!value) return errAsync(new NotFoundError('...'));  // ← span marked ERROR + exception recorded
      return okAsync(value);
    });
  }
}
```

The decorator duck-types the return value via `.andThen` presence. For `ResultAsync` methods it chains `.map` / `.mapErr` to end the span; for `async` methods it chains `.then` / `.catch`. In both cases an error is recorded as a span exception and the status is set to `ERROR`. A successful result leaves the span status as `OK`.

> Always add `@Span()` to use case `execute()` methods and service methods that call external I/O (LLM, repository). This keeps the trace tree complete for every request.

---

## Architecture Decisions

The decisions that shaped the observability setup are recorded in [`docs/decisions/`](./docs/decisions/):

| ADR | Decision |
|-----|----------|
| [ADR-0016](./docs/decisions/observability-2026-02-26-span-decorator-tracing.md) | `@Span()` decorator — tracing without polluting business logic |
| [ADR-0017](./docs/decisions/observability-2026-02-26-dual-exporter-console-or-otlp.md) | Dual exporter — console (default) or OTLP via env var |
| [ADR-0018](./docs/decisions/observability-2026-02-26-llm-content-as-otel-log-records.md) | LLM content captured as OTel log records — not span events |
| [ADR-0015](./docs/decisions/errors-2026-03-15-fire-and-forget-void-not-match.md) | Fire-and-forget ResultAsync: use `void`, not `.match()` |
| [ADR-0030](./docs/decisions/arch-2026-04-10-whatsapp-cloud-api-webhook.md) | WhatsApp via Meta Cloud API webhook — one conversation per phone number |
