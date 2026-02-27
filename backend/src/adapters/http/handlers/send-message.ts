import { Request, Response } from 'express';
import { SendMessageUseCase } from '../../../application/use-cases/send-message-use-case';
import { handleError } from './handle-error';

export function createSendMessageHandler(
  sendMessageUseCase: SendMessageUseCase,
) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { conversationId } = req.params;
      const { message } = req.body;
      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }
      const result = await sendMessageUseCase.execute(conversationId, message);
      res.status(200).json(result);
    } catch (error) {
      handleError(error, res);
    }
  };
}
