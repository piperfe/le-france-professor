import { Request, Response } from 'express';
import { GetAllConversationsUseCase } from '../../../application/use-cases/get-all-conversations-use-case';
import { createGetAllConversationsHandler } from './get-all-conversations';
import { okAsync, errAsync } from 'neverthrow';
import { ServiceUnavailableError } from '../../../domain/errors';

describe('createGetAllConversationsHandler', () => {
  let mockUseCase: jest.Mocked<GetAllConversationsUseCase>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let handler: ReturnType<typeof createGetAllConversationsHandler>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() } as any;
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    handler = createGetAllConversationsHandler(mockUseCase);
  });

  it('returns 200 with conversations array on success', async () => {
    const summaries = [
      { id: 'conv-1', title: 'Bonjour !', createdAt: new Date('2024-01-01') },
      { id: 'conv-2', title: 'Salut !', createdAt: new Date('2024-01-02') },
    ];
    mockUseCase.execute.mockReturnValue(okAsync(summaries));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({ conversations: summaries });
  });

  it('returns 200 with empty array when no conversations exist', async () => {
    mockUseCase.execute.mockReturnValue(okAsync([]));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({ conversations: [] });
  });

  it('returns 503 when repository is unavailable', async () => {
    mockUseCase.execute.mockReturnValue(errAsync(new ServiceUnavailableError('DB connection failed')));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(503);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'DB connection failed' });
  });
});
