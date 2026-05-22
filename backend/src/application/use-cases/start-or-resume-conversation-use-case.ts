import { ResultAsync, okAsync } from 'neverthrow';
import type { PhoneSessionRepository } from '../../domain/repositories/phone-session-repository';
import type { CreateConversationUseCase } from './create-conversation-use-case';
import { ServiceUnavailableError } from '../../domain/errors';

export enum ConversationStatus {
  STARTED = 'STARTED',
  RESUMED = 'RESUMED',
}

export type ConversationSession =
  | { status: ConversationStatus.STARTED; conversationId: string; initialMessage: string }
  | { status: ConversationStatus.RESUMED; conversationId: string };

export class StartOrResumeConversationUseCase {
  constructor(
    private readonly phoneSessionRepository: PhoneSessionRepository,
    private readonly createConversationUseCase: CreateConversationUseCase,
  ) {}

  execute(phone: string): ResultAsync<ConversationSession, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      this.phoneSessionRepository.findByPhone(phone),
      (error) => new ServiceUnavailableError(error instanceof Error ? error.message : 'Repository unavailable'),
    ).andThen((conversationId) => {
      if (conversationId) {
        return okAsync<ConversationSession, ServiceUnavailableError>({ status: ConversationStatus.RESUMED, conversationId });
      }
      return this.createConversationUseCase.execute().andThen(({ conversationId: newId, initialMessage }) =>
        ResultAsync.fromPromise(
          this.phoneSessionRepository.save(phone, newId),
          (error) => new ServiceUnavailableError(error instanceof Error ? error.message : 'Repository unavailable'),
        ).map((): ConversationSession => ({ status: ConversationStatus.STARTED, conversationId: newId, initialMessage })),
      );
    });
  }
}
