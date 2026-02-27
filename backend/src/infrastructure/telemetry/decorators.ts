import { SpanStatusCode } from '@opentelemetry/api';
import { tracer } from './tracer';

/**
 * @Span() — method decorator that wraps the target async method in an
 * OpenTelemetry span. The span name defaults to ClassName.methodName.
 *
 * Errors are recorded as span exceptions and the span status is set to ERROR
 * before re-throwing, so they always appear in traces.
 *
 * Usage:
 *   @Span()
 *   async execute(...) { ... }
 *
 *   @Span('custom.span.name')
 *   async someMethod(...) { ... }
 */
export function Span(name?: string) {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const spanName =
      name ?? `${(target as { constructor: { name: string } }).constructor.name}.${String(propertyKey)}`;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      return tracer.startActiveSpan(spanName, async (span) => {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
          throw error;
        } finally {
          span.end();
        }
      });
    };

    return descriptor;
  };
}
