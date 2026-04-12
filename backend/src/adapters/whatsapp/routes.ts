import { Router } from 'express';
import type { HandleWhatsAppMessageUseCase } from '../../application/use-cases/handle-whatsapp-message-use-case';
import type { HandleWhatsAppVoiceUseCase } from '../../application/use-cases/handle-whatsapp-voice-use-case';
import { createVerifyWebhookHandler } from './handlers/verify-webhook';
import { createHandleMessageHandler } from './handlers/handle-message';

export function createWhatsAppRoutes(
  verifyToken: string,
  handleWhatsAppMessageUseCase: HandleWhatsAppMessageUseCase,
  handleWhatsAppVoiceUseCase: HandleWhatsAppVoiceUseCase,
): Router {
  const router = Router();
  router.get('/webhook/whatsapp', createVerifyWebhookHandler(verifyToken));
  router.post('/webhook/whatsapp', createHandleMessageHandler(handleWhatsAppMessageUseCase, handleWhatsAppVoiceUseCase));
  return router;
}
