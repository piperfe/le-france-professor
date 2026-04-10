import { ResultAsync } from 'neverthrow';
import { Span } from '../../infrastructure/telemetry/decorators';
import type { PhoneSessionRepository } from '../../domain/repositories/phone-session-repository';
import type { WhatsAppSender } from '../../domain/services/whatsapp-sender';
import type { CreateConversationUseCase } from './create-conversation-use-case';
import type { SendMessageUseCase } from './send-message-use-case';
import { ServiceUnavailableError } from '../../domain/errors';

export class HandleWhatsAppMessageUseCase {
  constructor(
    private readonly phoneSessionRepository: PhoneSessionRepository,
    private readonly createConversationUseCase: CreateConversationUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly whatsAppSender: WhatsAppSender,
  ) {}

  @Span()
  execute(
    phone: string,
    messageText: string,
  ): ResultAsync<void, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.phoneSessionRepository.findConversationId(phone),
      (error) =>
        new ServiceUnavailableError(
          error instanceof Error ? error.message : 'Repository unavailable',
        ),
    ).andThen((conversationId) => {
      if (!conversationId) {
        return this.createConversationUseCase
          .execute()
          .andThen(({ conversationId: newId, initialMessage }) =>
            ResultAsync.fromPromise(
              this.phoneSessionRepository.save(phone, newId),
              (error) =>
                new ServiceUnavailableError(
                  error instanceof Error ? error.message : 'Repository unavailable',
                ),
            ).andThen(() => this.send(phone, initialMessage)),
          );
      }

      return this.sendMessageUseCase
        .execute(conversationId, messageText)
        .mapErr((error) => new ServiceUnavailableError(error.message))
        .andThen(({ tutorResponse }) => this.send(phone, tutorResponse));
    });
  }

  private send(to: string, body: string): ResultAsync<void, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.whatsAppSender.sendMessage(to, body),
      (error) =>
        new ServiceUnavailableError(
          error instanceof Error ? error.message : 'Failed to send WhatsApp reply',
        ),
    );
  }
}
