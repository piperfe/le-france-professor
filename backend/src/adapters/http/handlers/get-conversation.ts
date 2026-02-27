import { Request, Response } from 'express';
import { GetConversationUseCase } from '../../../application/use-cases/get-conversation-use-case';
import { handleError } from './handle-error';

export function createGetConversationHandler(
  getConversationUseCase: GetConversationUseCase,
) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { conversationId } = req.params;
      const conversation = await getConversationUseCase.execute(conversationId);
      res.status(200).json(conversation);
    } catch (error) {
      handleError(error, res);
    }
  };
}
