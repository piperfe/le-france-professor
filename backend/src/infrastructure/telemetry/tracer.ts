import { trace } from '@opentelemetry/api';
import { SERVICE_NAME } from './constants';

export const tracer = trace.getTracer(SERVICE_NAME, '1.0.0');
