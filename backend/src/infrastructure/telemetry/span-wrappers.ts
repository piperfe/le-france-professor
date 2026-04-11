import { SpanStatusCode } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';
import type { ResultAsync } from 'neverthrow';

export function isResultAsync(value: unknown): value is ResultAsync<unknown, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ResultAsync<unknown, unknown>).andThen === 'function'
  );
}

function endSpanOk(span: Span): void {
  span.end();
}

function endSpanErr(span: Span, error: unknown): void {
  span.recordException(error as Error);
  span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
  span.end();
}

export function wrapResultAsync(
  result: ResultAsync<unknown, unknown>,
  span: Span,
): ResultAsync<unknown, unknown> {
  return result
    .map((value) => { endSpanOk(span); return value; })
    .mapErr((error) => { endSpanErr(span, error); return error; });
}

export function wrapPromise(result: Promise<unknown>, span: Span): Promise<unknown> {
  return result
    .then((value) => { endSpanOk(span); return value; })
    .catch((error: unknown) => { endSpanErr(span, error); throw error; });
}
