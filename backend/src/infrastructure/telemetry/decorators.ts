import { SpanStatusCode } from '@opentelemetry/api';
import { tracer } from './tracer';

/**
 * @Span() — method decorator that wraps the target async method in an
 * OpenTelemetry span. The span name defaults to ClassName.methodName.
 *
 * Errors are recorded as span exceptions and the span status is set to ERROR
 * in two cases:
 *  - the method throws (classic async pattern)
 *  - the method returns a neverthrow Result.Err (duck-typed via isErr())
 *
 * Usage:
 *   @Span()
 *   async execute(...) { ... }
 *
 *   @Span('custom.span.name')
 *   async someMethod(...) { ... }
 */

function isErrResult(value: unknown): value is { isErr(): true; error: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isErr' in value &&
    typeof (value as { isErr: unknown }).isErr === 'function' &&
    (value as { isErr(): boolean }).isErr()
  );
}

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
          const result = await originalMethod.apply(this, args);

          if (isErrResult(result)) {
            span.recordException(result.error as Error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: (result.error as Error).message,
            });
          }

          return result;
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
