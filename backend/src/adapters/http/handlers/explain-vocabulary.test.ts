import { Request, Response } from 'express';
import { createExplainVocabularyHandler } from './explain-vocabulary';
import { okAsync, errAsync } from 'neverthrow';
import { ServiceUnavailableError } from '../../../domain/errors';
import type { ExplainVocabularyInConversationUseCase } from '../../../application/use-cases/explain-vocabulary-in-conversation-use-case';

describe('createExplainVocabularyHandler', () => {
  let mockUseCase: jest.Mocked<ExplainVocabularyInConversationUseCase>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let handler: ReturnType<typeof createExplainVocabularyHandler>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() } as any;
    mockRequest = { params: {}, body: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    handler = createExplainVocabularyHandler(mockUseCase);
  });

  it('returns 200 with explanation', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockRequest.body = { word: 'passée' };
    mockUseCase.execute.mockReturnValue(okAsync('« Passée » est le participe passé féminin du verbe « se passer ».'));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockUseCase.execute).toHaveBeenCalledWith('conv-123', 'passée');
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({ explanation: '« Passée » est le participe passé féminin du verbe « se passer ».' });
  });

  it('returns 400 when word is missing', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockRequest.body = {};

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockUseCase.execute).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'word is required' });
  });

  it('returns 503 when use case fails', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockRequest.body = { word: 'passée' };
    mockUseCase.execute.mockReturnValue(errAsync(new ServiceUnavailableError('LLM timeout')));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(503);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'LLM timeout' });
  });
});
