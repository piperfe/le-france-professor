import 'dotenv/config'; // must be first — loads .env before telemetry reads env vars
import './infrastructure/telemetry/setup'; // must be second — patches openai before it loads
import express from 'express';
import cors from 'cors';
import { apiReference } from '@scalar/express-api-reference';
import { createRoutes } from './adapters/http/routes';
import { openApiSpec } from './adapters/http/openapi-spec';
import { CreateConversationUseCase } from './application/use-cases/create-conversation-use-case';
import { SendMessageUseCase } from './application/use-cases/send-message-use-case';
import { GetConversationUseCase } from './application/use-cases/get-conversation-use-case';
import { GetAllConversationsUseCase } from './application/use-cases/get-all-conversations-use-case';
import { ExplainVocabularyUseCase } from './application/use-cases/explain-vocabulary-use-case';
import { SaveVocabularyUseCase } from './application/use-cases/save-vocabulary-use-case';
import { GetVocabularyUseCase } from './application/use-cases/get-vocabulary-use-case';
import { GenerateTitleUseCase } from './application/use-cases/generate-title-use-case';
import { ExtractTopicUseCase } from './application/use-cases/extract-topic-use-case';
import { InMemoryConversationRepository } from './infrastructure/repositories/in-memory-conversation-repository';
import { InMemoryVocabularyRepository } from './infrastructure/repositories/in-memory-vocabulary-repository';
import { OllamaTutorService } from './infrastructure/llm/ollama-tutor-service';
import { OllamaVocabularyService } from './infrastructure/llm/ollama-vocabulary-service';
import { OllamaTitleService } from './infrastructure/llm/ollama-title-service';

function ensureOllamaConfig(): void {
  const model = process.env.OLLAMA_MODEL?.trim();
  if (!model) {
    console.error(
      'OLLAMA_MODEL is required. Set it in backend/.env, e.g.:\n' +
        '  OLLAMA_MODEL=gemma3:4b\n' +
        '  OLLAMA_BASE_URL=http://localhost:11434/v1',
    );
    process.exit(1);
  }
}

function createApp(): express.Application {
  ensureOllamaConfig();

  const app = express();
  app.use(cors());
  app.use(express.json());

  const conversationRepository = new InMemoryConversationRepository();
  const vocabularyRepository = new InMemoryVocabularyRepository();

  const ollamaConfig = {
    baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    model: process.env.OLLAMA_MODEL!,
  };

  const tutorService = new OllamaTutorService(ollamaConfig);
  const vocabularyService = new OllamaVocabularyService(ollamaConfig);
  const titleService = new OllamaTitleService(ollamaConfig);

  const createConversationUseCase = new CreateConversationUseCase(
    conversationRepository,
    tutorService,
  );
  const generateTitleUseCase = new GenerateTitleUseCase(conversationRepository, titleService);
  const extractTopicUseCase = new ExtractTopicUseCase(conversationRepository, tutorService);
  const sendMessageUseCase = new SendMessageUseCase(
    conversationRepository,
    tutorService,
    generateTitleUseCase,
    extractTopicUseCase,
  );
  const getConversationUseCase = new GetConversationUseCase(
    conversationRepository,
  );
  const getAllConversationsUseCase = new GetAllConversationsUseCase(
    conversationRepository,
  );
  const explainVocabularyUseCase = new ExplainVocabularyUseCase(vocabularyService);
  const saveVocabularyUseCase = new SaveVocabularyUseCase(vocabularyRepository);
  const getVocabularyUseCase = new GetVocabularyUseCase(vocabularyRepository);

  app.use(
    '/api',
    createRoutes(
      createConversationUseCase,
      sendMessageUseCase,
      getConversationUseCase,
      getAllConversationsUseCase,
      explainVocabularyUseCase,
      saveVocabularyUseCase,
      getVocabularyUseCase,
    ),
  );

  app.use('/docs', apiReference({ spec: { content: openApiSpec } }));

  return app;
}

export { createApp };

if (require.main === module) {
  const app = createApp();
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
