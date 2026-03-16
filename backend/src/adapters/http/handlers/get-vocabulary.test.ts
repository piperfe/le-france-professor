import { Request, Response } from 'express';
import { GetVocabularyUseCase } from '../../../application/use-cases/get-vocabulary-use-case';
import { VocabularyEntry } from '../../../domain/entities/vocabulary-entry';
import { createGetVocabularyHandler } from './get-vocabulary';
import { okAsync, errAsync } from 'neverthrow';
import { ServiceUnavailableError } from '../../../domain/errors';

describe('createGetVocabularyHandler', () => {
  let mockUseCase: jest.Mocked<GetVocabularyUseCase>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let handler: ReturnType<typeof createGetVocabularyHandler>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() } as any;
    mockRequest = { params: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    handler = createGetVocabularyHandler(mockUseCase);
  });

  it('returns 200 with vocabulary list', async () => {
    const entries = [VocabularyEntry.create('passée', 'Explication.', 'msg-1', 'conv-1')];
    mockRequest.params = { conversationId: 'conv-1' };
    mockUseCase.execute.mockReturnValue(okAsync(entries));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({ vocabulary: entries });
    expect(mockUseCase.execute).toHaveBeenCalledWith('conv-1');
  });

  it('returns 200 with empty array when no entries', async () => {
    mockRequest.params = { conversationId: 'conv-1' };
    mockUseCase.execute.mockReturnValue(okAsync([]));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({ vocabulary: [] });
  });

  it('returns 503 when use case fails', async () => {
    mockRequest.params = { conversationId: 'conv-1' };
    mockUseCase.execute.mockReturnValue(errAsync(new ServiceUnavailableError('DB error')));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(503);
  });
});
