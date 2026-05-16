# ADR-0017: Dual exporter — console (default) or OTLP via env var

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 📡 Observability |
| Date | 2026-02-26 |

## Context

Jaeger was the initial target. The request: keep both console and OTLP exporters and select at runtime so local dev does not require Jaeger running.

## Decision

OTEL_TRACES_EXPORTER env var selects the exporter: default → ConsoleSpanExporter; otlp → OTLPTraceExporter. createLogExporter() follows the same logic for logs.

## Consequences

- `dotenv/config` and `setup.ts` are loaded inside `if (require.main === module)` in index.ts, so they only run when the server boots — not when `createApp()` is imported by tests. `setup.ts` still reads env vars before OpenAI is loaded (correct order is preserved within the boot block).
- Jaeger was replaced by Grafana + Tempo + Loki + OTel Collector for the full stack.
- Tests use instanceof checks on real exporter instances — no mocks.

## Source Conversation

> **Feb 26 — Thursday — 13:05**
>
> **You:** can we mantaining the both exporter, then we can select based on a env var ... update the automated test since the exporter'll depend on a env var
