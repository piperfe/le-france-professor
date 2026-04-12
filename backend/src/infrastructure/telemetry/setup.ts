import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { LoggerProvider, SimpleLogRecordProcessor, ConsoleLogRecordExporter } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { logs } from '@opentelemetry/api-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { SERVICE_NAME } from './constants';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { OpenAIInstrumentation } from '@opentelemetry/instrumentation-openai';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: SERVICE_NAME,
});

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

const loggerProvider = new LoggerProvider({
  resource,
  processors: [new SimpleLogRecordProcessor(createLogExporter())],
});
logs.setGlobalLoggerProvider(loggerProvider);

const sdk = new NodeSDK({
  resource,
  traceExporter: createTraceExporter(),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    // Instruments native fetch() (backed by undici in Node.js 18+).
    // Captures outgoing HTTP spans for calls like MetaWhatsAppClient.sendMessage()
    // that use fetch instead of the http/https core modules.
    new UndiciInstrumentation(),
    // Instruments every openai client call (chat.completions.create, etc.)
    // and emits spans with gen_ai.* semantic convention attributes.
    // Set OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true to also
    // capture prompt/response content as OTel log records correlated with the span.
    new OpenAIInstrumentation(),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
