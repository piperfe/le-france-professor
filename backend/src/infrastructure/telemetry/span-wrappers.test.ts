import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { SpanStatusCode } from '@opentelemetry/api';
import { okAsync, errAsync } from 'neverthrow';
import { wrapResultAsync, wrapPromise } from './span-wrappers';
import { tracer } from './tracer';

const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
});

beforeAll(() => {
  provider.register();
});

afterAll(async () => {
  await provider.shutdown();
});

beforeEach(() => {
  exporter.reset();
});

describe('wrapResultAsync', () => {
  describe('Ok result', () => {
    it('ends the span', async () => {
      await tracer.startActiveSpan('test', (span) => wrapResultAsync(okAsync('x'), span));

      expect(exporter.getFinishedSpans()).toHaveLength(1);
    });

    it('does not set error status', async () => {
      await tracer.startActiveSpan('test', (span) => wrapResultAsync(okAsync('x'), span));

      const [span] = exporter.getFinishedSpans();
      expect(span.status.code).not.toBe(SpanStatusCode.ERROR);
    });

    it('returns the value unchanged', async () => {
      const result = await tracer.startActiveSpan('test', (span) => wrapResultAsync(okAsync('x'), span));

      expect(result.isOk()).toBe(true);
    });

    it('preserves the ResultAsync chain', async () => {
      let chained = false;
      await tracer
        .startActiveSpan('test', (span) => wrapResultAsync(okAsync('x'), span))
        .andThen(() => {
          chained = true;
          return okAsync(undefined);
        });

      expect(chained).toBe(true);
    });
  });

  describe('Err result', () => {
    it('sets span status to ERROR with the error message', async () => {
      await tracer.startActiveSpan('test', (span) => wrapResultAsync(errAsync(new Error('boom')), span));

      const [span] = exporter.getFinishedSpans();
      expect(span.status.code).toBe(SpanStatusCode.ERROR);
      expect(span.status.message).toBe('boom');
    });

    it('records the exception as a span event', async () => {
      await tracer.startActiveSpan('test', (span) => wrapResultAsync(errAsync(new Error('boom')), span));

      const [span] = exporter.getFinishedSpans();
      const exceptionEvent = span.events.find((e) => e.name === 'exception');
      expect(exceptionEvent).toBeDefined();
      expect(exceptionEvent?.attributes?.['exception.message']).toBe('boom');
    });

    it('ends the span', async () => {
      await tracer.startActiveSpan('test', (span) => wrapResultAsync(errAsync(new Error('boom')), span));

      expect(exporter.getFinishedSpans()).toHaveLength(1);
    });

    it('returns the Err unchanged', async () => {
      const result = await tracer.startActiveSpan('test', (span) =>
        wrapResultAsync(errAsync(new Error('boom')), span),
      );

      expect(result.isErr()).toBe(true);
    });
  });
});

describe('wrapPromise', () => {
  describe('resolved Promise', () => {
    it('ends the span', async () => {
      await tracer.startActiveSpan('test', (span) => wrapPromise(Promise.resolve('x'), span));

      expect(exporter.getFinishedSpans()).toHaveLength(1);
    });

    it('does not set error status', async () => {
      await tracer.startActiveSpan('test', (span) => wrapPromise(Promise.resolve('x'), span));

      const [span] = exporter.getFinishedSpans();
      expect(span.status.code).not.toBe(SpanStatusCode.ERROR);
    });

    it('returns the value unchanged', async () => {
      const result = await tracer.startActiveSpan('test', (span) => wrapPromise(Promise.resolve('x'), span));

      expect(result).toBe('x');
    });
  });

  describe('rejected Promise', () => {
    it('sets span status to ERROR with the error message', async () => {
      await expect(
        tracer.startActiveSpan('test', (span) => wrapPromise(Promise.reject(new Error('boom')), span)),
      ).rejects.toThrow('boom');

      const [span] = exporter.getFinishedSpans();
      expect(span.status.code).toBe(SpanStatusCode.ERROR);
      expect(span.status.message).toBe('boom');
    });

    it('records the exception as a span event', async () => {
      await expect(
        tracer.startActiveSpan('test', (span) => wrapPromise(Promise.reject(new Error('boom')), span)),
      ).rejects.toThrow('boom');

      const [span] = exporter.getFinishedSpans();
      const exceptionEvent = span.events.find((e) => e.name === 'exception');
      expect(exceptionEvent).toBeDefined();
      expect(exceptionEvent?.attributes?.['exception.message']).toBe('boom');
    });

    it('ends the span', async () => {
      await expect(
        tracer.startActiveSpan('test', (span) => wrapPromise(Promise.reject(new Error('boom')), span)),
      ).rejects.toThrow('boom');

      expect(exporter.getFinishedSpans()).toHaveLength(1);
    });

    it('re-throws the error', async () => {
      await expect(
        tracer.startActiveSpan('test', (span) => wrapPromise(Promise.reject(new Error('boom')), span)),
      ).rejects.toThrow('boom');
    });
  });
});
