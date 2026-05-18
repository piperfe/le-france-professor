import type { Request, Response } from 'express';
import type { ExplainVocabularyInConversationUseCase } from '../../../application/use-cases/explain-vocabulary-in-conversation-use-case';
import { HTTP_STATUS } from '../../../domain/errors';

export function createExplainVocabularyHandler(
  explainVocabularyInConversationUseCase: ExplainVocabularyInConversationUseCase,
) {
  return async (req: Request, res: Response): Promise<void> => {
    const { conversationId } = req.params;
    const { word } = req.body;

    if (!word) {
      res.status(400).json({ error: 'word is required' });
      return;
    }

    const result = await explainVocabularyInConversationUseCase.execute(conversationId, word);

    result.match(
      (explanation) => res.status(200).json({ explanation }),
      (error) => res.status(HTTP_STATUS[error.code] ?? 500).json({ error: error.message }),
    );
  };
}
