import type { Request, Response } from 'express';
import type { GetConversationUseCase } from '../../../application/use-cases/get-conversation-use-case';
import { HTTP_STATUS } from '../../../domain/errors';

export function createGetConversationHandler(
  getConversationUseCase: GetConversationUseCase,
) {
  return async (req: Request, res: Response): Promise<void> => {
    const { conversationId } = req.params;
    const result = await getConversationUseCase.execute(conversationId);

    result.match(
      (conversation) => res.status(200).json(conversation),
      (error) => res.status(HTTP_STATUS[error.code] ?? 500).json({ error: error.message }),
    );
  };
}
