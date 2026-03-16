import type { Request, Response } from 'express';
import type { GetVocabularyUseCase } from '../../../application/use-cases/get-vocabulary-use-case';
import { HTTP_STATUS } from '../../../domain/errors';

export function createGetVocabularyHandler(getVocabularyUseCase: GetVocabularyUseCase) {
  return async (req: Request, res: Response): Promise<void> => {
    const { conversationId } = req.params;

    const result = await getVocabularyUseCase.execute(conversationId);

    result.match(
      (vocabulary) => res.status(200).json({ vocabulary }),
      (error) => res.status(HTTP_STATUS[error.code] ?? 500).json({ error: error.message }),
    );
  };
}
