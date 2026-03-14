import type { Request, Response } from 'express';
import type { GetAllConversationsUseCase } from '../../../application/use-cases/get-all-conversations-use-case';
import { HTTP_STATUS } from '../../../domain/errors';

export function createGetAllConversationsHandler(
  getAllConversationsUseCase: GetAllConversationsUseCase,
) {
  return async (_req: Request, res: Response): Promise<void> => {
    const result = await getAllConversationsUseCase.execute();

    result.match(
      (conversations) => res.status(200).json({ conversations }),
      (error) => res.status(HTTP_STATUS[error.code] ?? 500).json({ error: error.message }),
    );
  };
}
