import type { Request, Response } from 'express';
import type { ExplainVocabularyUseCase } from '../../../application/use-cases/explain-vocabulary-use-case';
import type { SaveVocabularyUseCase } from '../../../application/use-cases/save-vocabulary-use-case';
import { HTTP_STATUS } from '../../../domain/errors';

export function createExplainVocabularyHandler(
  explainVocabularyUseCase: ExplainVocabularyUseCase,
  saveVocabularyUseCase: SaveVocabularyUseCase,
) {
  return async (req: Request, res: Response): Promise<void> => {
    const { conversationId } = req.params;
    const { word, context, sourceMessageId } = req.body;

    if (!word) {
      res.status(400).json({ error: 'word is required' });
      return;
    }

    const result = await explainVocabularyUseCase.execute(word, context ?? '');

    result.match(
      (response) => {
        void saveVocabularyUseCase.execute(
          word,
          response.explanation,
          sourceMessageId ?? '',
          conversationId,
        );
        res.status(200).json(response);
      },
      (error) => res.status(HTTP_STATUS[error.code] ?? 500).json({ error: error.message }),
    );
  };
}
