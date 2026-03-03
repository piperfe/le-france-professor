import { Request, Response } from 'express';
import { CreateConversationUseCase } from '../../../application/use-cases/create-conversation-use-case';
import { createCreateConversationHandler } from './create-conversation';
import { okAsync, errAsync } from 'neverthrow';
import { ServiceUnavailableError } from '../../../domain/errors';

describe('createCreateConversationHandler', () => {
  let mockUseCase: jest.Mocked<CreateConversationUseCase>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let handler: ReturnType<typeof createCreateConversationHandler>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() } as any;
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    handler = createCreateConversationHandler(mockUseCase);
  });

  it('returns 201 and result when conversation is created', async () => {
    const result = { conversationId: 'conv-123', initialMessage: 'Bonjour !' };
    mockUseCase.execute.mockReturnValue(okAsync(result));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockUseCase.execute).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith(result);
  });

  it('returns 503 when tutor service is unavailable', async () => {
    mockUseCase.execute.mockReturnValue(errAsync(new ServiceUnavailableError('LLM unavailable')));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(503);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'LLM unavailable' });
  });
});
