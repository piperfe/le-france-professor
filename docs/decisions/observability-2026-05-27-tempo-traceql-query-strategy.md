# ADR-0040: Tempo TraceQL query strategy — aggregate search for stats, rate() for time series

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 📡 Observability |
| Date | 2026-05-27 |

## Context

Grafana's Tempo datasource exposes two distinct query paths. Both use TraceQL syntax but hit completely different execution engines:

| Path | Grafana panel type | Tempo endpoint | Data source |
|---|---|---|---|
| Aggregate search | Stat, Table | `/api/search` | Ingester + WAL + immutable blocks |
| Metrics pipeline | Time series | `/api/metrics/query_range` | local-blocks WAL only |

The `local-blocks` metrics generator processor receives span batches from the Tempo distributor. Due to OTel batching (`batch` processor, `timeout: 1s`), a trace's root HTTP span and its child spans arrive in **separate batches** timed 1-2 seconds apart. The local-blocks processor flushes a trace after it has been idle for `trace_idle_period` (10 s). In practice only the root span's batch arrives before the flush window closes — child spans from later batches are not added to the flushed block.

This was confirmed empirically: `{ } | count_over_time() by(name)` on local-blocks returns only root HTTP span names; child span names (`chat llama-3.3-70b-versatile`, etc.) never appear.

**Consequence:** `sum_over_time(span.gen_ai.usage.input_tokens)` returns `{"series":[]}` even when regular search finds matching spans. The `gen_ai.*` token attributes are on the LLM SDK child spans, which are absent from local-blocks.

## Decision

Use a **two-tier query strategy** for the LLM Token Usage dashboard:

**Stat panels (totals over selected time range)** → TraceQL aggregate search  
Queries: `{ span.gen_ai.usage.input_tokens > 0 } | sum(span.gen_ai.usage.input_tokens)`, `| count()`, etc.  
These hit the ingester which has all spans. Data appears immediately.

**Time series panels** → TraceQL metrics pipeline with `rate()` or `count_over_time()`  
Only root/HTTP spans are available, so time series panels show **request rate grouped by route** rather than token sums.  
Query: `{ resource.service.name = "le-france-professor" } | rate() by(rootName)`  
Data appears within ~30 s after a trace completes.

**`queryType` in dashboard JSON must always be `"traceql"`** — not `"metrics"`. Grafana's Tempo plugin (12.4.0) detects the metrics pipeline operator from query content and routes to `query_range` automatically. Setting `queryType: "metrics"` causes a 500.

## Token time series — path forward

To show actual token sums over time as a time series, the backend must emit `gen_ai.client.token.usage` as an OTel **counter instrument** (per GenAI semantic conventions). This counter flows through the OTel collector → Prometheus exporter → Prometheus → Grafana Prometheus datasource. The `instrumentation-openai` library emits span attributes, not metric instruments, so a manual counter in `LlmTutorService`/`LlmVocabularyService` after each LLM call is required.

## Consequences

- Stat panels (Input Tokens, Output Tokens, LLM Calls, Total) are accurate — they use the full span corpus.
- The time series panel shows call rate, not token counts — it still reveals usage patterns and endpoint breakdown.
- Any new time series panel querying child span attributes will produce empty results; use aggregate search in a table panel instead.
- Tempo 2.8+ required for `sum_over_time()` support; `flush_to_storage: true` required in `local_blocks` for metrics to persist across Tempo restarts.
- Grafana provisioned dashboards do **not** hot-reload via `updateIntervalSeconds` in Grafana 12.4.0 — use `POST /api/dashboards/db` with `overwrite: true` to push updates.
