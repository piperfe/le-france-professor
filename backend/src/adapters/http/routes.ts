import { Router } from 'express';
import type { CreateConversationUseCase } from '../../application/use-cases/create-conversation-use-case';
import type { SendMessageUseCase } from '../../application/use-cases/send-message-use-case';
import type { GetConversationUseCase } from '../../application/use-cases/get-conversation-use-case';
import type { ExplainVocabularyUseCase } from '../../application/use-cases/explain-vocabulary-use-case';
import { createCreateConversationHandler } from './handlers/create-conversation';
import { createSendMessageHandler } from './handlers/send-message';
import { createGetConversationHandler } from './handlers/get-conversation';
import { createExplainVocabularyHandler } from './handlers/explain-vocabulary';

export function createRoutes(
  createConversationUseCase: CreateConversationUseCase,
  sendMessageUseCase: SendMessageUseCase,
  getConversationUseCase: GetConversationUseCase,
  explainVocabularyUseCase: ExplainVocabularyUseCase,
): Router {
  const router = Router();
  router.post(
    '/conversations',
    createCreateConversationHandler(createConversationUseCase),
  );
  router.post(
    '/conversations/:conversationId/messages',
    createSendMessageHandler(sendMessageUseCase),
  );
  router.get(
    '/conversations/:conversationId',
    createGetConversationHandler(getConversationUseCase),
  );
  router.post(
    '/conversations/:conversationId/vocabulary',
    createExplainVocabularyHandler(explainVocabularyUseCase),
  );
  return router;
}
