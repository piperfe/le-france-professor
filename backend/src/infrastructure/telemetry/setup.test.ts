import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleLogRecordExporter } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { createTraceExporter, createLogExporter } from './setup';

describe('createTraceExporter', () => {
  const originalEnv = process.env.OTEL_TRACES_EXPORTER;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.OTEL_TRACES_EXPORTER;
    } else {
      process.env.OTEL_TRACES_EXPORTER = originalEnv;
    }
  });

  it('returns ConsoleSpanExporter when OTEL_TRACES_EXPORTER is not set', () => {
    delete process.env.OTEL_TRACES_EXPORTER;

    expect(createTraceExporter()).toBeInstanceOf(ConsoleSpanExporter);
  });

  it('returns ConsoleSpanExporter when OTEL_TRACES_EXPORTER=console', () => {
    process.env.OTEL_TRACES_EXPORTER = 'console';

    expect(createTraceExporter()).toBeInstanceOf(ConsoleSpanExporter);
  });

  it('returns OTLPTraceExporter when OTEL_TRACES_EXPORTER=otlp', () => {
    process.env.OTEL_TRACES_EXPORTER = 'otlp';

    expect(createTraceExporter()).toBeInstanceOf(OTLPTraceExporter);
  });
});

describe('createLogExporter', () => {
  const originalEnv = process.env.OTEL_TRACES_EXPORTER;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.OTEL_TRACES_EXPORTER;
    } else {
      process.env.OTEL_TRACES_EXPORTER = originalEnv;
    }
  });

  it('returns ConsoleLogRecordExporter when OTEL_TRACES_EXPORTER is not set', () => {
    delete process.env.OTEL_TRACES_EXPORTER;

    expect(createLogExporter()).toBeInstanceOf(ConsoleLogRecordExporter);
  });

  it('returns ConsoleLogRecordExporter when OTEL_TRACES_EXPORTER=console', () => {
    process.env.OTEL_TRACES_EXPORTER = 'console';

    expect(createLogExporter()).toBeInstanceOf(ConsoleLogRecordExporter);
  });

  it('returns OTLPLogExporter when OTEL_TRACES_EXPORTER=otlp', () => {
    process.env.OTEL_TRACES_EXPORTER = 'otlp';

    expect(createLogExporter()).toBeInstanceOf(OTLPLogExporter);
  });
});
