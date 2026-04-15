import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleLogRecordExporter } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';

// OTEL_TRACES_EXPORTER=console  → stdout (default for development)
// OTEL_TRACES_EXPORTER=otlp     → OTLP/HTTP (Jaeger, Grafana Tempo, etc.)
//                                  defaults to http://localhost:4318/v1/traces
//                                  override endpoint with OTEL_EXPORTER_OTLP_ENDPOINT
export function createTraceExporter(): ConsoleSpanExporter | OTLPTraceExporter {
  if (process.env.OTEL_TRACES_EXPORTER === 'otlp') {
    return new OTLPTraceExporter();
  }
  return new ConsoleSpanExporter();
}

// Logs follow the same exporter selection as traces.
// When captureMessageContent is enabled, the OpenAI instrumentation emits
// prompt/response content as OTel log records correlated with the active span.
export function createLogExporter(): ConsoleLogRecordExporter | OTLPLogExporter {
  if (process.env.OTEL_TRACES_EXPORTER === 'otlp') {
    return new OTLPLogExporter();
  }
  return new ConsoleLogRecordExporter();
}
