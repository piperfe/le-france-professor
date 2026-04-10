import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { SpanStatusCode } from '@opentelemetry/api';
import { okAsync, errAsync } from 'neverthrow';
import { Span } from './decorators';

const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
});

// Plain Promise methods — exercises wrapPromise
class PromiseService {
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

// Non-async methods returning ResultAsync directly — exercises wrapResultAsync
class ResultAsyncService {
  @Span()
  execute() {
    return okAsync('ok');
  }

  @Span()
  executeFail() {
    return errAsync(new Error('result error'));
  }
}

describe('@Span() decorator', () => {
  beforeAll(() => {
    provider.register();
  });

  afterAll(async () => {
    await provider.shutdown();
  });

  beforeEach(() => {
    exporter.reset();
  });

  describe('span naming', () => {
    it('uses ClassName.methodName as default span name', async () => {
      await new PromiseService().compute();

      const [span] = exporter.getFinishedSpans();
      expect(span.name).toBe('PromiseService.compute');
    });

    it('uses custom span name when provided', async () => {
      await new PromiseService().customNamed();

      const [span] = exporter.getFinishedSpans();
      expect(span.name).toBe('custom.operation');
    });
  });

  describe('async methods', () => {
    let service: PromiseService;

    beforeEach(() => {
      service = new PromiseService();
    });

    it('returns the original method result', async () => {
      const result = await service.compute();

      expect(result).toBe('ok');
    });

    it('ends the span after successful execution', async () => {
      await service.compute();

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

  });

  describe('ResultAsync methods', () => {
    let service: ResultAsyncService;

    beforeEach(() => {
      service = new ResultAsyncService();
    });

    it('ends the span when result is Ok', async () => {
      await service.execute();

      expect(exporter.getFinishedSpans()).toHaveLength(1);
    });

    it('does not set error status when result is Ok', async () => {
      await service.execute();

      const [span] = exporter.getFinishedSpans();
      expect(span.status.code).not.toBe(SpanStatusCode.ERROR);
    });

    it('returns the value unchanged so callers can chain .andThen', async () => {
      const result = await service.execute();

      expect(result.isOk()).toBe(true);
    });

    it('sets span status to ERROR when result is Err', async () => {
      await service.executeFail();

      const [span] = exporter.getFinishedSpans();
      expect(span.status.code).toBe(SpanStatusCode.ERROR);
      expect(span.status.message).toBe('result error');
    });

    it('records the exception as a span event when result is Err', async () => {
      await service.executeFail();

      const [span] = exporter.getFinishedSpans();
      const exceptionEvent = span.events.find((e) => e.name === 'exception');
      expect(exceptionEvent).toBeDefined();
      expect(exceptionEvent?.attributes?.['exception.message']).toBe('result error');
    });

    it('ends the span when result is Err', async () => {
      await service.executeFail();

      expect(exporter.getFinishedSpans()).toHaveLength(1);
    });

    it('returns the Err unchanged so callers can still match on it', async () => {
      const result = await service.executeFail();

      expect(result.isErr()).toBe(true);
    });

    it('preserves ResultAsync so callers can chain .andThen without breaking', async () => {
      let chained = false;
      await service.execute().andThen(() => {
        chained = true;
        return okAsync(undefined);
      });

      expect(chained).toBe(true);
    });
  });
});
