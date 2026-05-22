import { Router } from 'express';
import type { StartOrResumeConversationUseCase } from '../../application/use-cases/start-or-resume-conversation-use-case';
import type { SendMessageUseCase } from '../../application/use-cases/send-message-use-case';
import type { WhatsAppVoiceTranscriber } from './voice-transcriber';
import type { WhatsAppSender } from './ports/whatsapp-sender';
import type { WhatsAppCommand } from './handlers/whatsapp-command';
import { createVerifyWebhookHandler } from './handlers/verify-webhook';
import { createHandleMessageHandler } from './handlers/handle-message';

export function createWhatsAppRoutes(
  verifyToken: string,
  startOrResumeConversationUseCase: StartOrResumeConversationUseCase,
  sendMessageUseCase: SendMessageUseCase,
  whatsAppSender: WhatsAppSender,
  commands: WhatsAppCommand[],
  voiceTranscriber: WhatsAppVoiceTranscriber,
): Router {
  const router = Router();
  router.get('/webhook/whatsapp', createVerifyWebhookHandler(verifyToken));
  router.post(
    '/webhook/whatsapp',
    createHandleMessageHandler(
      startOrResumeConversationUseCase,
      sendMessageUseCase,
      whatsAppSender,
      commands,
      voiceTranscriber,
    ),
  );
  return router;
}
