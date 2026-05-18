import { ResultAsync } from 'neverthrow';
import type { PhoneSessionRepository } from '../../domain/repositories/phone-session-repository';
import type { WhatsAppSender } from '../../domain/services/whatsapp-sender';
import type { CreateConversationUseCase } from './create-conversation-use-case';
import type { ExplainVocabularyInConversationUseCase } from './explain-vocabulary-in-conversation-use-case';
import type { SendMessageUseCase } from './send-message-use-case';
import { ServiceUnavailableError } from '../../domain/errors';

const VOCABULARY_REGEX = /^\/vocabulary\s+(.+)$/i;
const UNKNOWN_COMMAND_REPLY = 'Commande inconnue. Pour expliquer un mot, écrivez /vocabulary [mot].';

export class HandleWhatsAppMessageUseCase {
  constructor(
    private readonly phoneSessionRepository: PhoneSessionRepository,
    private readonly createConversationUseCase: CreateConversationUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly explainVocabularyInConversationUseCase: ExplainVocabularyInConversationUseCase,
    private readonly whatsAppSender: WhatsAppSender,
  ) { }

  execute(
    phone: string,
    messageText: string,
  ): ResultAsync<void, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.phoneSessionRepository.findByPhone(phone),
      (error) => new ServiceUnavailableError(error instanceof Error ? error.message : 'Repository unavailable'),
    ).andThen((conversationId) => {
      if (!conversationId) return this.startConversation(phone);
      if (this.isCommand(messageText)) return this.handleCommand(phone, conversationId, messageText);
      return this.continueConversation(phone, conversationId, messageText);
    });
  }

  private startConversation(phone: string): ResultAsync<void, ServiceUnavailableError> {
    return this.createConversationUseCase
      .execute()
      .andThen(({ conversationId, initialMessage }) =>
        ResultAsync.fromPromise(
          this.phoneSessionRepository.save(phone, conversationId),
          (error) => new ServiceUnavailableError(error instanceof Error ? error.message : 'Repository unavailable'),
        ).andThen(() => this.reply(phone, initialMessage)),
      );
  }

  private handleCommand(
    phone: string,
    conversationId: string,
    text: string,
  ): ResultAsync<void, ServiceUnavailableError> {
    const match = VOCABULARY_REGEX.exec(text);
    if (match) {
      return this.explainVocabularyInConversationUseCase.execute(conversationId, match[1].trim())
        .andThen((explanation) => this.reply(phone, explanation));
    }
    return this.reply(phone, UNKNOWN_COMMAND_REPLY);
  }

  private continueConversation(
    phone: string,
    conversationId: string,
    messageText: string,
  ): ResultAsync<void, ServiceUnavailableError> {
    return this.sendMessageUseCase
      .execute(conversationId, messageText)
      .mapErr((error) => new ServiceUnavailableError(error.message))
      .andThen(({ tutorResponse }) => this.reply(phone, tutorResponse));
  }

  private isCommand(text: string): boolean {
    return text.startsWith('/');
  }

  private reply(phone: string, body: string): ResultAsync<void, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.whatsAppSender.sendMessage(phone, body),
      (error) => new ServiceUnavailableError(error instanceof Error ? error.message : 'Failed to send WhatsApp reply'),
    );
  }
}
