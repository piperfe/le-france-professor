import { Request, Response } from 'express';
import { CreateConversationUseCase } from '../../../application/use-cases/create-conversation-use-case';
import { handleError } from './handle-error';

export function createCreateConversationHandler(
  createConversationUseCase: CreateConversationUseCase,
) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await createConversationUseCase.execute();
      res.status(201).json(result);
    } catch (error) {
      handleError(error, res);
    }
  };
}
