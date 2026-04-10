import { SpanStatusCode } from '@opentelemetry/api';
import type { Span as OtelSpan } from '@opentelemetry/api';
import type { ResultAsync } from 'neverthrow';
import { tracer } from './tracer';

/**
 * @Span() — method decorator that wraps the target method in an OpenTelemetry span.
 * The span name defaults to ClassName.methodName.
 *
 * Dispatches to one of two wrappers based on the return value:
 *  - wrapResultAsync — non-async methods returning ResultAsync<T, E> directly;
 *                      chains .map/.mapErr so callers keep the ResultAsync type
 *  - wrapPromise     — async methods returning Promise<T>; uses .then/.catch
 *
 * Errors are recorded as span exceptions and span status is set to ERROR when:
 *  - the method throws
 *  - the method returns a neverthrow Err result
 *
 * Usage:
 *   @Span()
 *   execute(...): ResultAsync<T, E> { ... }
 *
 *   @Span('custom.span.name')
 *   async someMethod(...): Promise<T> { ... }
 */

function isResultAsync(value: unknown): value is ResultAsync<unknown, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ResultAsync<unknown, unknown>).andThen === 'function'
  );
}

function wrapResultAsync(
  result: ResultAsync<unknown, unknown>,
  span: OtelSpan,
): ResultAsync<unknown, unknown> {
  return result
    .map((value) => {
      span.end();
      return value;
    })
    .mapErr((error) => {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.end();
      return error;
    });
}

function wrapPromise(result: Promise<unknown>, span: OtelSpan): Promise<unknown> {
  return result
    .then((value) => {
      span.end();
      return value;
    })
    .catch((error: unknown) => {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.end();
      throw error;
    });
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

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      return tracer.startActiveSpan(spanName, (span) => {
        const result = originalMethod.apply(this, args);

        if (isResultAsync(result)) {
          return wrapResultAsync(result, span);
        }

        return wrapPromise(result as Promise<unknown>, span);
      });
    };

    return descriptor;
  };
}
