import { Request, Response } from 'express';
import { ExplainVocabularyUseCase } from '../../../application/use-cases/explain-vocabulary-use-case';
import { SaveVocabularyUseCase } from '../../../application/use-cases/save-vocabulary-use-case';
import { createExplainVocabularyHandler } from './explain-vocabulary';
import { okAsync, errAsync } from 'neverthrow';
import { ServiceUnavailableError } from '../../../domain/errors';

describe('createExplainVocabularyHandler', () => {
  let mockExplainUseCase: jest.Mocked<ExplainVocabularyUseCase>;
  let mockSaveUseCase: jest.Mocked<SaveVocabularyUseCase>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let handler: ReturnType<typeof createExplainVocabularyHandler>;

  beforeEach(() => {
    mockExplainUseCase = { execute: jest.fn() } as any;
    mockSaveUseCase = { execute: jest.fn() } as any;
    mockRequest = { params: {}, body: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    handler = createExplainVocabularyHandler(mockExplainUseCase, mockSaveUseCase);
  });

  it('returns 200 with explanation', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockRequest.body = { word: 'passée', context: "Comment s'est passée ta journée ?", sourceMessageId: 'msg-1' };
    const result = { explanation: '« Passée » est le participe passé féminin du verbe « se passer ».' };
    mockExplainUseCase.execute.mockReturnValue(okAsync(result));
    mockSaveUseCase.execute.mockReturnValue(okAsync(undefined));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockExplainUseCase.execute).toHaveBeenCalledWith('passée', "Comment s'est passée ta journée ?");
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(result);
  });

  it('saves vocabulary entry after successful explanation', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockRequest.body = { word: 'passée', context: "Context.", sourceMessageId: 'msg-1' };
    const explanation = '« Passée » est le participe passé féminin.';
    mockExplainUseCase.execute.mockReturnValue(okAsync({ explanation }));
    mockSaveUseCase.execute.mockReturnValue(okAsync(undefined));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockSaveUseCase.execute).toHaveBeenCalledWith('passée', explanation, 'msg-1', 'conv-123');
  });

  it('defaults sourceMessageId to empty string when not provided', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockRequest.body = { word: 'passée', context: 'Context.' };
    mockExplainUseCase.execute.mockReturnValue(okAsync({ explanation: 'Expl.' }));
    mockSaveUseCase.execute.mockReturnValue(okAsync(undefined));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockSaveUseCase.execute).toHaveBeenCalledWith('passée', 'Expl.', '', 'conv-123');
  });

  it('still returns 200 when save fails', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockRequest.body = { word: 'passée', context: 'Context.', sourceMessageId: 'msg-1' };
    mockExplainUseCase.execute.mockReturnValue(okAsync({ explanation: 'Expl.' }));
    mockSaveUseCase.execute.mockReturnValue(errAsync(new ServiceUnavailableError('DB error')));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
  });

  it('defaults context to empty string when not provided', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockRequest.body = { word: 'bonjour' };
    mockExplainUseCase.execute.mockReturnValue(okAsync({ explanation: 'Bonjour est une salutation.' }));
    mockSaveUseCase.execute.mockReturnValue(okAsync(undefined));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockExplainUseCase.execute).toHaveBeenCalledWith('bonjour', '');
  });

  it('returns 400 when word is missing', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockRequest.body = {};

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockExplainUseCase.execute).not.toHaveBeenCalled();
    expect(mockSaveUseCase.execute).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'word is required' });
  });

  it('returns 503 and does not save when explain fails', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockRequest.body = { word: 'passée', context: 'some phrase' };
    mockExplainUseCase.execute.mockReturnValue(errAsync(new ServiceUnavailableError('LLM timeout')));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockSaveUseCase.execute).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(503);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'LLM timeout' });
  });
});
