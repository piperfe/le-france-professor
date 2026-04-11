import { tracer } from './tracer';
import { isResultAsync, wrapResultAsync, wrapPromise } from './span-wrappers';

export function Span(name?: string) {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
    const spanName =
      name ?? `${(target as { constructor: { name: string } }).constructor.name}.${String(propertyKey)}`;

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      return tracer.startActiveSpan(spanName, (span) => {
        const result = originalMethod.apply(this, args);
        return isResultAsync(result) ? wrapResultAsync(result, span) : wrapPromise(result as Promise<unknown>, span);
      });
    };

    return descriptor;
  };
}
