import { Router } from 'express';
import type { CreateConversationUseCase } from '../../application/use-cases/create-conversation-use-case';
import type { SendMessageUseCase } from '../../application/use-cases/send-message-use-case';
import type { GetConversationUseCase } from '../../application/use-cases/get-conversation-use-case';
import type { GetAllConversationsUseCase } from '../../application/use-cases/get-all-conversations-use-case';
import type { ExplainVocabularyUseCase } from '../../application/use-cases/explain-vocabulary-use-case';
import type { SaveVocabularyUseCase } from '../../application/use-cases/save-vocabulary-use-case';
import type { GetVocabularyUseCase } from '../../application/use-cases/get-vocabulary-use-case';
import { createCreateConversationHandler } from './handlers/create-conversation';
import { createSendMessageHandler } from './handlers/send-message';
import { createGetConversationHandler } from './handlers/get-conversation';
import { createGetAllConversationsHandler } from './handlers/get-all-conversations';
import { createExplainVocabularyHandler } from './handlers/explain-vocabulary';
import { createGetVocabularyHandler } from './handlers/get-vocabulary';

export function createRoutes(
  createConversationUseCase: CreateConversationUseCase,
  sendMessageUseCase: SendMessageUseCase,
  getConversationUseCase: GetConversationUseCase,
  getAllConversationsUseCase: GetAllConversationsUseCase,
  explainVocabularyUseCase: ExplainVocabularyUseCase,
  saveVocabularyUseCase: SaveVocabularyUseCase,
  getVocabularyUseCase: GetVocabularyUseCase,
): Router {
  const router = Router();
  router.get(
    '/conversations',
    createGetAllConversationsHandler(getAllConversationsUseCase),
  );
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
    createExplainVocabularyHandler(explainVocabularyUseCase, saveVocabularyUseCase),
  );
  router.get(
    '/conversations/:conversationId/vocabulary',
    createGetVocabularyHandler(getVocabularyUseCase),
  );
  return router;
}
