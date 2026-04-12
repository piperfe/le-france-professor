import type { Request, Response } from 'express';
import type { HandleWhatsAppMessageUseCase } from '../../../application/use-cases/handle-whatsapp-message-use-case';
import type { HandleWhatsAppVoiceUseCase } from '../../../application/use-cases/handle-whatsapp-voice-use-case';

// TODO: error handling & retry strategy
// Use cases are fired with void — if they fail the message is silently lost (Meta
// already got 200 and will not retry). See Notion card:
// [WhatsApp] Error handling & retry strategy for fire-and-forget use cases

export function createHandleMessageHandler(
  handleWhatsAppMessageUseCase: HandleWhatsAppMessageUseCase,
  handleWhatsAppVoiceUseCase: HandleWhatsAppVoiceUseCase,
) {
  return (req: Request, res: Response): void => {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    res.status(200).json({ status: 'ok' });

    if (!msg) return;

    if (msg.type === 'text' && msg.text?.body) {
      void handleWhatsAppMessageUseCase.execute(msg.from, msg.text.body);
      return;
    }

    if (msg.type === 'audio' && msg.audio?.id) {
      void handleWhatsAppVoiceUseCase.execute(msg.from, msg.audio.id);
    }
  };
}
