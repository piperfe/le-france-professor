# ADR-0018: LLM content captured as OTel log records — not span events

| Field | Value |
|-------|-------|
| Status | Established |
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

## Source Conversation

> **Feb 26 — Thursday — 16:35**
>
> **You:** the logging exporter will select the same exporter than the traces ??? calling createExporter() ??? it's neccesary passing the process.env.OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT?.toLowerCase() === 'true' in the OpenAiInstrumentation() constructor ???
