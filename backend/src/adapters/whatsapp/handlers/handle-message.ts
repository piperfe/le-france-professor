import type { Request, Response } from 'express';
import type { HandleWhatsAppMessageUseCase } from '../../../application/use-cases/handle-whatsapp-message-use-case';

export function createHandleMessageHandler(
  handleWhatsAppMessageUseCase: HandleWhatsAppMessageUseCase,
) {
  return (req: Request, res: Response): void => {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    res.status(200).json({ status: 'ok' });

    if (!msg || msg.type !== 'text' || !msg.text?.body) {
      return;
    }

    void handleWhatsAppMessageUseCase.execute(msg.from, msg.text.body);
  };
}
