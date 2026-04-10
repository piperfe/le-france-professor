import type { Request, Response } from 'express';
import type { HandleWhatsAppMessageUseCase } from '../../../application/use-cases/handle-whatsapp-message-use-case';
import { HTTP_STATUS } from '../../../domain/errors';

export function createHandleMessageHandler(
  handleWhatsAppMessageUseCase: HandleWhatsAppMessageUseCase,
) {
  return async (req: Request, res: Response): Promise<void> => {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!msg || msg.type !== 'text' || !msg.text?.body) {
      res.status(200).json({ status: 'ok' });
      return;
    }

    const result = await handleWhatsAppMessageUseCase.execute(msg.from, msg.text.body);

    result.match(
      () => res.status(200).json({ status: 'ok' }),
      (error) => res.status(HTTP_STATUS[error.code] ?? 500).json({ error: error.message }),
    );
  };
}
