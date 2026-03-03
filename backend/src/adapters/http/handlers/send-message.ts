import { Request, Response } from 'express';
import { SendMessageUseCase } from '../../../application/use-cases/send-message-use-case';
import { HTTP_STATUS } from '../../../domain/errors';

export function createSendMessageHandler(sendMessageUseCase: SendMessageUseCase) {
  return async (req: Request, res: Response): Promise<void> => {
    const { conversationId } = req.params;
    const { message } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const result = await sendMessageUseCase.execute(conversationId, message);

    result.match(
      (response) => res.status(200).json(response),
      (error) => res.status(HTTP_STATUS[error.code] ?? 500).json({ error: error.message }),
    );
  };
}
