import 'dotenv/config'; // must be first — loads .env before telemetry reads env vars
import './infrastructure/telemetry/setup'; // must be second — patches openai before it loads
import express from 'express';
import cors from 'cors';
import { apiReference } from '@scalar/express-api-reference';
import { createRoutes } from './adapters/http/routes';
import { createWhatsAppRoutes } from './adapters/whatsapp/routes';
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
import { HandleWhatsAppMessageUseCase } from './application/use-cases/handle-whatsapp-message-use-case';
import { HandleWhatsAppVoiceUseCase } from './application/use-cases/handle-whatsapp-voice-use-case';
import { createDatabase } from './infrastructure/db/client';
import { SqliteConversationRepository } from './infrastructure/repositories/sqlite-conversation-repository';
import { SqliteVocabularyRepository } from './infrastructure/repositories/sqlite-vocabulary-repository';
import { SqlitePhoneSessionRepository } from './infrastructure/repositories/sqlite-phone-session-repository';
import { OllamaTutorService } from './infrastructure/llm/ollama-tutor-service';
import { OllamaVocabularyService } from './infrastructure/llm/ollama-vocabulary-service';
import { OllamaTitleService } from './infrastructure/llm/ollama-title-service';
import { MetaWhatsAppClient } from './infrastructure/whatsapp/meta-whatsapp-client';
import { MetaMediaDownloader } from './infrastructure/whatsapp/meta-media-downloader';
import { WhisperTranscriptionService } from './infrastructure/whatsapp/whisper-transcription-service';
import { withTracing } from './infrastructure/telemetry/tracing-proxy';

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

function getWhatsAppConfig(): { verifyToken: string; accessToken: string; phoneNumberId: string } | null {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!verifyToken || !accessToken || !phoneNumberId) return null;

  return { verifyToken, accessToken, phoneNumberId };
}

function createApp(): express.Application {
  ensureOllamaConfig();
  const whatsAppConfig = getWhatsAppConfig();

  const app = express();
  app.use(cors());
  app.use(express.json());

  const db = createDatabase(process.env.DATABASE_URL ?? ':memory:');
  const conversationRepository = new SqliteConversationRepository(db);
  const vocabularyRepository = new SqliteVocabularyRepository(db);

  const ollamaConfig = {
    baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    model: process.env.OLLAMA_MODEL!,
  };

  const tutorService = new OllamaTutorService(ollamaConfig);
  const vocabularyService = new OllamaVocabularyService(ollamaConfig);
  const titleService = new OllamaTitleService(ollamaConfig);

  const createConversationUseCase = withTracing(new CreateConversationUseCase(
    conversationRepository,
    tutorService,
  ));
  const generateTitleUseCase = withTracing(new GenerateTitleUseCase(conversationRepository, titleService));
  const extractTopicUseCase = withTracing(new ExtractTopicUseCase(conversationRepository, tutorService));
  const sendMessageUseCase = withTracing(new SendMessageUseCase(
    conversationRepository,
    tutorService,
    generateTitleUseCase,
    extractTopicUseCase,
  ));
  const getConversationUseCase = withTracing(new GetConversationUseCase(conversationRepository));
  const getAllConversationsUseCase = withTracing(new GetAllConversationsUseCase(conversationRepository));
  const explainVocabularyUseCase = withTracing(new ExplainVocabularyUseCase(vocabularyService));
  const saveVocabularyUseCase = withTracing(new SaveVocabularyUseCase(vocabularyRepository));
  const getVocabularyUseCase = withTracing(new GetVocabularyUseCase(vocabularyRepository));

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

  if (whatsAppConfig) {
    const phoneSessionRepository = new SqlitePhoneSessionRepository(db);
    const whatsAppSender = new MetaWhatsAppClient(whatsAppConfig.accessToken, whatsAppConfig.phoneNumberId);
    const handleWhatsAppMessageUseCase = withTracing(new HandleWhatsAppMessageUseCase(
      phoneSessionRepository,
      createConversationUseCase,
      sendMessageUseCase,
      whatsAppSender,
    ));
    const mediaDownloader = new MetaMediaDownloader(whatsAppConfig.accessToken);
    const whisperUrl = process.env.WHISPER_URL || 'http://127.0.0.1:7600';
    const audioTranscriber = new WhisperTranscriptionService(whisperUrl);
    const handleWhatsAppVoiceUseCase = withTracing(new HandleWhatsAppVoiceUseCase(
      mediaDownloader,
      audioTranscriber,
      handleWhatsAppMessageUseCase,
    ));
    app.use('/api', createWhatsAppRoutes(whatsAppConfig.verifyToken, handleWhatsAppMessageUseCase, handleWhatsAppVoiceUseCase));
  }

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
