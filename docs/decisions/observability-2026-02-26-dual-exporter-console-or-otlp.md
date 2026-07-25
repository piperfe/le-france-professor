# ADR-0017: Triple exporter — console (dev), OTLP (instrumented), none (prod zero-overhead)

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 📡 Observability |
| Date | 2026-02-26 |

## Context

Jaeger was the initial target. The request: keep both console and OTLP exporters and select at runtime so local dev does not require Jaeger running.

## Decision

OTEL_TRACES_EXPORTER env var selects the exporter:
- **Default or `console`** → ConsoleSpanExporter (development — prints spans to stdout)
- **`otlp`** → OTLPTraceExporter (instrumented — sends to Grafana Tempo, Jaeger, etc.)
- **`none`** → SDK not initialized, API uses no-ops (production — zero overhead)

createLogExporter() follows the same logic for logs. When OTEL_TRACES_EXPORTER=none, the entire OpenTelemetry SDK is skipped (`backend/src/infrastructure/telemetry/setup.ts` wraps SDK initialization in a conditional), eliminating all overhead.

## Consequences

- `dotenv/config` and `setup.ts` are loaded inside `if (require.main === module)` in index.ts, so they only run when the server boots — not when `createApp()` is imported by tests. `setup.ts` still reads env vars before OpenAI is loaded (correct order is preserved within the boot block).
- Jaeger was replaced by Grafana + Tempo + Loki + OTel Collector for the full stack.
- Tests use instanceof checks on real exporter instances — no mocks.
- Production deployments on resource-constrained environments (e.g., Oracle Always Free 2 OCPU VM) can set OTEL_TRACES_EXPORTER=none to eliminate SDK overhead entirely. This allows the API to function with no-op implementations, suitable when observability infrastructure is unavailable.
- The "none" option is implemented by wrapping SDK initialization in a conditional in `setup.ts` (not by returning null from exporters — more robust and follows OpenTelemetry SDK patterns).

## Source Conversation

> **Feb 26 — Thursday — 13:05**
>
> **You:** can we mantaining the both exporter, then we can select based on a env var ... update the automated test since the exporter'll depend on a env var
