import type { Request, Response } from 'express';
import type { CreateConversationUseCase } from '../../../application/use-cases/create-conversation-use-case';
import { HTTP_STATUS } from '../../../domain/errors';

export function createCreateConversationHandler(
  createConversationUseCase: CreateConversationUseCase,
) {
  return async (req: Request, res: Response): Promise<void> => {
    const result = await createConversationUseCase.execute();

    result.match(
      (conversation) => res.status(201).json(conversation),
      (error) => res.status(HTTP_STATUS[error.code] ?? 500).json({ error: error.message }),
    );
  };
}
