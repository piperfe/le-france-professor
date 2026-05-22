import type { ResultAsync } from 'neverthrow';
import type { ServiceUnavailableError } from '../../../domain/errors';

export interface WhatsAppCommand {
  readonly trigger: RegExp;
  readonly usage: string;
  execute(phone: string, conversationId: string, text: string): ResultAsync<void, ServiceUnavailableError>;
}
