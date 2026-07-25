import { NodeSDK } from '@opentelemetry/sdk-node';
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { logs } from '@opentelemetry/api-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { SERVICE_NAME } from './constants';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { OpenAIInstrumentation } from '@opentelemetry/instrumentation-openai';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { createTraceExporter, createLogExporter } from './exporters';

// Only initialize OpenTelemetry SDK if tracing is enabled
// OTEL_TRACES_EXPORTER=none → no SDK, API uses no-ops (minimal overhead)
// OTEL_TRACES_EXPORTER=console → logs to stdout (development)
// OTEL_TRACES_EXPORTER=otlp → sends to OTLP collector (production)
if (process.env.OTEL_TRACES_EXPORTER !== 'none') {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
  });

  const loggerProvider = new LoggerProvider({
    resource,
    processors: [new SimpleLogRecordProcessor({ exporter: createLogExporter() })],
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
}
