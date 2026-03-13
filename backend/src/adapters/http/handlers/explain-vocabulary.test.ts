import { Request, Response } from 'express';
import { ExplainVocabularyUseCase } from '../../../application/use-cases/explain-vocabulary-use-case';
import { createExplainVocabularyHandler } from './explain-vocabulary';
import { okAsync, errAsync } from 'neverthrow';
import { ServiceUnavailableError } from '../../../domain/errors';

describe('createExplainVocabularyHandler', () => {
  let mockUseCase: jest.Mocked<ExplainVocabularyUseCase>;
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
    mockRequest.body = { word: 'passée', context: 'Comment s\'est passée ta journée ?' };
    const result = { explanation: '« Passée » est le participe passé féminin du verbe « se passer ».' };
    mockUseCase.execute.mockReturnValue(okAsync(result));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockUseCase.execute).toHaveBeenCalledWith('passée', 'Comment s\'est passée ta journée ?');
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(result);
  });

  it('defaults context to empty string when not provided', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockRequest.body = { word: 'bonjour' };
    mockUseCase.execute.mockReturnValue(okAsync({ explanation: 'Bonjour est une salutation.' }));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockUseCase.execute).toHaveBeenCalledWith('bonjour', '');
  });

  it('returns 400 when word is missing', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockRequest.body = {};

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockUseCase.execute).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'word is required' });
  });

  it('returns 503 when vocabulary service is unavailable', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockRequest.body = { word: 'passée', context: 'some phrase' };
    mockUseCase.execute.mockReturnValue(errAsync(new ServiceUnavailableError('LLM timeout')));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(503);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'LLM timeout' });
  });
});
