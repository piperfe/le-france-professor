import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { SERVICE_NAME } from './constants';

const logger = logs.getLogger(SERVICE_NAME);

export function logInfo(body: string, attributes?: Record<string, string>): void {
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: JSON.stringify({ content: body }),
    attributes,
  });
}
