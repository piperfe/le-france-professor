import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { okAsync, errAsync } from 'neverthrow';
import { Span } from './decorators';

const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
});

class PromiseService {
  @Span()
  async compute(): Promise<string> {
    return 'ok';
  }

  @Span('custom.operation')
  async customNamed(): Promise<string> {
    return 'custom';
  }
}

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

  describe('wiring', () => {
    it('opens a span for ResultAsync methods', async () => {
      await new ResultAsyncService().execute();

      expect(exporter.getFinishedSpans()).toHaveLength(1);
    });

    it('opens a span for async methods', async () => {
      await new PromiseService().compute();

      expect(exporter.getFinishedSpans()).toHaveLength(1);
    });
  });
});
