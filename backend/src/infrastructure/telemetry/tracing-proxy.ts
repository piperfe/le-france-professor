import { tracer } from './tracer';
import { isResultAsync, wrapResultAsync } from './span-wrappers';

/**
 * Wraps every method of a use case instance in an OpenTelemetry span.
 * Span name: ClassName.methodName — matches the @Span() decorator convention.
 * Applied at the composition root so use cases stay free of infrastructure imports.
 */
export function withTracing<T extends object>(instance: T): T {
  const className = instance.constructor.name;

  return new Proxy(instance, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function' || prop === 'constructor') {
        return value;
      }

      return function (this: unknown, ...args: unknown[]) {
        const spanName = `${className}.${String(prop)}`;
        return tracer.startActiveSpan(spanName, (span) => {
          const result = (value as (...a: unknown[]) => unknown).apply(target, args);
          return isResultAsync(result) ? wrapResultAsync(result, span) : (span.end(), result);
        });
      };
    },
  });
}
