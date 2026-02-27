import { Request, Response } from 'express';
import { CreateConversationUseCase } from '../../../application/use-cases/create-conversation-use-case';
import { createCreateConversationHandler } from './create-conversation';

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

  it('returns 201 and result when use case succeeds', async () => {
    const result = {
      conversationId: 'conv-123',
      initialMessage: 'Bonjour !',
    };
    mockUseCase.execute.mockResolvedValue(result);

    await handler(
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockUseCase.execute).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith(result);
  });

  it('returns 500 and error message when use case throws', async () => {
    mockUseCase.execute.mockRejectedValue(new Error('Something failed'));

    await handler(
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Something failed',
    });
  });
});
