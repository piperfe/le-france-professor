import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { SpanStatusCode } from '@opentelemetry/api';
import { Span } from './decorators';

const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
});

class TestService {
  @Span()
  async compute(): Promise<string> {
    return 'ok';
  }

  @Span('custom.operation')
  async customNamed(): Promise<string> {
    return 'custom';
  }

  @Span()
  async fail(): Promise<never> {
    throw new Error('boom');
  }
}

describe('@Span() decorator', () => {
  let service: TestService;

  beforeAll(() => {
    provider.register();
  });

  afterAll(async () => {
    await provider.shutdown();
  });

  beforeEach(() => {
    exporter.reset();
    service = new TestService();
  });

  it('uses ClassName.methodName as default span name', async () => {
    await service.compute();

    const [span] = exporter.getFinishedSpans();
    expect(span.name).toBe('TestService.compute');
  });

  it('uses custom span name when provided', async () => {
    await service.customNamed();

    const [span] = exporter.getFinishedSpans();
    expect(span.name).toBe('custom.operation');
  });

  it('returns the original method result', async () => {
    const result = await service.compute();

    expect(result).toBe('ok');
  });

  it('ends the span after successful execution', async () => {
    await service.compute();

    // spans only appear in getFinishedSpans() once span.end() is called
    expect(exporter.getFinishedSpans()).toHaveLength(1);
  });

  it('does not set error status on success', async () => {
    await service.compute();

    const [span] = exporter.getFinishedSpans();
    expect(span.status.code).not.toBe(SpanStatusCode.ERROR);
  });

  it('records the exception as a span event when method throws', async () => {
    await expect(service.fail()).rejects.toThrow('boom');

    const [span] = exporter.getFinishedSpans();
    const exceptionEvent = span.events.find((e) => e.name === 'exception');
    expect(exceptionEvent).toBeDefined();
    expect(exceptionEvent?.attributes?.['exception.message']).toBe('boom');
  });

  it('sets span status to ERROR with the error message when method throws', async () => {
    await expect(service.fail()).rejects.toThrow('boom');

    const [span] = exporter.getFinishedSpans();
    expect(span.status.code).toBe(SpanStatusCode.ERROR);
    expect(span.status.message).toBe('boom');
  });

  it('ends the span even when method throws', async () => {
    await expect(service.fail()).rejects.toThrow('boom');

    expect(exporter.getFinishedSpans()).toHaveLength(1);
  });

  it('re-throws the original error', async () => {
    await expect(service.fail()).rejects.toThrow('boom');
  });
});
