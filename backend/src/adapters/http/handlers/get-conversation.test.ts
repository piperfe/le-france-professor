import { Request, Response } from 'express';
import { GetConversationUseCase } from '../../../application/use-cases/get-conversation-use-case';
import { createGetConversationHandler } from './get-conversation';

describe('createGetConversationHandler', () => {
  let mockUseCase: jest.Mocked<GetConversationUseCase>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let handler: ReturnType<typeof createGetConversationHandler>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() } as any;
    mockRequest = { params: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    handler = createGetConversationHandler(mockUseCase);
  });

  it('returns 200 and conversation when found', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    const conversation = {
      id: 'conv-123',
      messages: [],
      createdAt: new Date(),
    };
    mockUseCase.execute.mockResolvedValue(conversation);

    await handler(
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockUseCase.execute).toHaveBeenCalledWith('conv-123');
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(conversation);
  });

  it('returns 500 when use case throws', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockUseCase.execute.mockRejectedValue(new Error('Conversation not found'));

    await handler(
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Conversation not found',
    });
  });
});
