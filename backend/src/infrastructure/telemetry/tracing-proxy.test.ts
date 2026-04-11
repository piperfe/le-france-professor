import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { okAsync } from 'neverthrow';
import { withTracing } from './tracing-proxy';

const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
});

class FakeUseCase {
  execute() {
    return okAsync('ok');
  }

  getValue(): string {
    return 'sync';
  }
}

describe('withTracing proxy', () => {
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
    it('uses ClassName.methodName as span name', async () => {
      await withTracing(new FakeUseCase()).execute();

      const [span] = exporter.getFinishedSpans();
      expect(span.name).toBe('FakeUseCase.execute');
    });
  });

  describe('wiring', () => {
    it('opens a span for ResultAsync methods', async () => {
      await withTracing(new FakeUseCase()).execute();

      expect(exporter.getFinishedSpans()).toHaveLength(1);
    });

    it('opens a span for non-ResultAsync methods', () => {
      withTracing(new FakeUseCase()).getValue();

      expect(exporter.getFinishedSpans()).toHaveLength(1);
    });
  });
});
