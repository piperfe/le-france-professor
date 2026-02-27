import { trace } from '@opentelemetry/api';

export const tracer = trace.getTracer('le-france-professor', '1.0.0');
