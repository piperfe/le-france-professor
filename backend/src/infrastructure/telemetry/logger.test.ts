import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { LoggerProvider, SimpleLogRecordProcessor, InMemoryLogRecordExporter } from '@opentelemetry/sdk-logs';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { tracer } from './tracer';
import { logInfo } from './logger';

const spanExporter = new InMemorySpanExporter();
const logExporter = new InMemoryLogRecordExporter();

const tracerProvider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(spanExporter)],
});

const loggerProvider = new LoggerProvider({
  processors: [new SimpleLogRecordProcessor(logExporter)],
});

beforeAll(() => {
  tracerProvider.register();
  logs.setGlobalLoggerProvider(loggerProvider);
});

afterAll(async () => {
  await tracerProvider.shutdown();
  await loggerProvider.shutdown();
});

beforeEach(() => {
  spanExporter.reset();
  logExporter.reset();
});

describe('logInfo', () => {
  it('wraps the body as {"content": ...} for consistency with LLM content logs', async () => {
    await tracer.startActiveSpan('test', async (span) => {
      logInfo('transcription text', { 'event.name': 'whatsapp.transcription' });
      span.end();
    });

    const [record] = logExporter.getFinishedLogRecords();
    expect(record.body).toBe(JSON.stringify({ content: 'transcription text' }));
    expect(record.attributes['event.name']).toBe('whatsapp.transcription');
  });

  it('emits with INFO severity', async () => {
    await tracer.startActiveSpan('test', async (span) => {
      logInfo('hello');
      span.end();
    });

    const [record] = logExporter.getFinishedLogRecords();
    expect(record.severityNumber).toBe(SeverityNumber.INFO);
    expect(record.severityText).toBe('INFO');
  });

  it('correlates the log record to the active span via traceId', async () => {
    let activeTraceId: string | undefined;

    await tracer.startActiveSpan('test', async (span) => {
      activeTraceId = span.spanContext().traceId;
      logInfo('transcription text');
      span.end();
    });

    const [record] = logExporter.getFinishedLogRecords();
    expect(record.spanContext?.traceId).toBe(activeTraceId);
  });
});
