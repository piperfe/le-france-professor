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
import { GetVocabularyUseCase } from './application/use-cases/get-vocabulary-use-case';
import { GenerateTitleUseCase } from './application/use-cases/generate-title-use-case';
import { ExtractTopicUseCase } from './application/use-cases/extract-topic-use-case';
import { ExplainVocabularyInConversationUseCase } from './application/use-cases/explain-vocabulary-in-conversation-use-case';
import { StartOrResumeConversationUseCase } from './application/use-cases/start-or-resume-conversation-use-case';
import { WhatsAppVoiceTranscriber } from './adapters/whatsapp/voice-transcriber';
import { VocabularyCommand } from './adapters/whatsapp/handlers/vocabulary-command';
import { NotebookCommand } from './adapters/whatsapp/handlers/notebook-command';
import { createDatabase } from './infrastructure/db/client';
import { SqliteConversationRepository } from './infrastructure/repositories/sqlite-conversation-repository';
import { SqliteVocabularyRepository } from './infrastructure/repositories/sqlite-vocabulary-repository';
import { SqlitePhoneSessionRepository } from './infrastructure/repositories/sqlite-phone-session-repository';
import { LlmTutorService } from './infrastructure/llm/llm-tutor-service';
import { LlmVocabularyService } from './infrastructure/llm/llm-vocabulary-service';
import { LlmTitleService } from './infrastructure/llm/llm-title-service';
import { MetaWhatsAppClient } from './infrastructure/whatsapp/meta-whatsapp-client';
import { WhatsAppNotebookFormatter } from './adapters/whatsapp/formatters/notebook-formatter';
import { WhatsAppVocabularyFormatter } from './adapters/whatsapp/formatters/vocabulary-formatter';
import { MetaMediaDownloader } from './infrastructure/whatsapp/meta-media-downloader';
import { WhisperTranscriptionService } from './infrastructure/whatsapp/whisper-transcription-service';
import { withTracing } from './infrastructure/telemetry/tracing-proxy';
import type { Env } from './env';

export function createApp(env: Env): express.Application {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const db = createDatabase(env.db.url);
  const conversationRepository = new SqliteConversationRepository(db);
  const vocabularyRepository = new SqliteVocabularyRepository(db);

  const tutorService = new LlmTutorService(env.llm);
  const vocabularyService = new LlmVocabularyService(env.llm);
  const titleService = new LlmTitleService(env.llm);

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
  const getVocabularyUseCase = withTracing(new GetVocabularyUseCase(vocabularyRepository));
  const explainVocabularyInConversationUseCase = withTracing(new ExplainVocabularyInConversationUseCase(
    conversationRepository,
    vocabularyService,
    vocabularyRepository,
  ));

  app.use(
    '/api',
    createRoutes(
      createConversationUseCase,
      sendMessageUseCase,
      getConversationUseCase,
      getAllConversationsUseCase,
      explainVocabularyInConversationUseCase,
      getVocabularyUseCase,
    ),
  );

  if (env.whatsapp) {
    const phoneSessionRepository = new SqlitePhoneSessionRepository(db);
    const whatsAppSender = new MetaWhatsAppClient(env.whatsapp.accessToken, env.whatsapp.phoneNumberId);
    const notebookFormatter = new WhatsAppNotebookFormatter();
    const vocabularyFormatter = new WhatsAppVocabularyFormatter();

    const startOrResumeConversationUseCase = withTracing(new StartOrResumeConversationUseCase(
      phoneSessionRepository,
      createConversationUseCase,
    ));

    const commands = [
      new VocabularyCommand(explainVocabularyInConversationUseCase, vocabularyFormatter, whatsAppSender),
      new NotebookCommand(getVocabularyUseCase, notebookFormatter, whatsAppSender),
    ];

    const mediaDownloader = new MetaMediaDownloader(env.whatsapp.accessToken);
    const audioTranscriber = new WhisperTranscriptionService(env.whisper.url);
    const voiceTranscriber = withTracing(new WhatsAppVoiceTranscriber(
      mediaDownloader,
      audioTranscriber,
    ));

    app.use('/api', createWhatsAppRoutes(
      env.whatsapp.verifyToken,
      startOrResumeConversationUseCase,
      sendMessageUseCase,
      whatsAppSender,
      commands,
      voiceTranscriber,
    ));
  }

  app.use('/docs', apiReference({ spec: { content: openApiSpec } }));

  return app;
}
