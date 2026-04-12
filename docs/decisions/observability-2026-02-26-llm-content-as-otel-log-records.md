# ADR-0018: AI model content captured as OTel log records — not span attributes

| Field | Value |
|-------|-------|
| Status | Amended (2026-04-12) |
| Domain | 📡 Observability |
| Date | 2026-02-26 |

## Context

@opentelemetry/instrumentation-openai v0.10+ emits LLM prompt/response content as OTel log records (logger.emit()), not as span.addEvent(). Jaeger does not display OTel log records.

## Decision

Set up a separate LoggerProvider with OTLPLogExporter alongside the trace pipeline. Enable content capture via OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true.

## Consequences

- LLM prompts and responses appear as log records correlated to parent spans by traceId in Loki.
- The env var must be loaded before the OpenAIInstrumentation() constructor runs.
- Grafana Loki datasource shows the LLM content; Tempo links traces ↔ logs by traceId.

## Amendment — 2026-04-12: generalised to all AI model content

### Context

WhatsApp voice note transcription (whisper.cpp) produces the same kind of content as LLM output — variable-length text from an AI model. Putting it as a span attribute would be wrong: attributes are size-limited, indexed metadata. The log record path established for LLM content is the correct home.

### Decision

Extend the principle to all AI model content: any service that produces variable-length text output from an AI model emits it as an OTel log record, not a span attribute.

A shared `logInfo()` helper was introduced in `infrastructure/telemetry/logger.ts` to enforce the format for all custom content logs:

- **Body format**: `JSON.stringify({ content: body })` — consistent with what `instrumentation-openai` emits, so all content logs are queryable the same way in Loki (`| json | line_format "{{.content}}"`)
- **Severity**: `INFO` / `SeverityNumber.INFO`
- **Correlation**: the OTel SDK automatically injects `traceId` and `spanId` from the active span context

Each content type has its own env var gate — same pattern as `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT`:

| Content | Env var |
|---|---|
| LLM prompt / response | `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true` |
| WhatsApp voice transcription | `OTEL_WHATSAPP_CAPTURE_TRANSCRIPTION=true` |

`SERVICE_NAME` was extracted to `infrastructure/telemetry/constants.ts` to avoid the magic string `'le-france-professor'` being duplicated across `tracer.ts`, `logger.ts`, and `setup.ts`.

### Consequences

- Any future AI model content (e.g. TTS output, translation) follows the same pattern: call `logInfo()` inside a `@Span()`-decorated method, behind its own env var gate.
- `WhisperTranscriptionService.transcribe()` is the reference implementation.
- `infrastructure/telemetry/logger.test.ts` verifies the traceId correlation using `InMemoryLogRecordExporter` alongside `InMemorySpanExporter`.

## Source Conversation

> **Feb 26 — Thursday — 16:35**
>
> **You:** the logging exporter will select the same exporter than the traces ??? calling createExporter() ??? it's neccesary passing the process.env.OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT?.toLowerCase() === 'true' in the OpenAiInstrumentation() constructor ???
