import { Request, Response } from 'express';
import { SendMessageUseCase } from '../../../application/use-cases/send-message-use-case';
import { createSendMessageHandler } from './send-message';

describe('createSendMessageHandler', () => {
  let mockUseCase: jest.Mocked<SendMessageUseCase>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let handler: ReturnType<typeof createSendMessageHandler>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() } as any;
    mockRequest = { params: {}, body: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    handler = createSendMessageHandler(mockUseCase);
  });

  it('returns 200 and result when message is sent', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockRequest.body = { message: 'Hello' };
    const result = {
      message: 'Hello',
      tutorResponse: 'Bonjour !',
    };
    mockUseCase.execute.mockResolvedValue(result);

    await handler(
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockUseCase.execute).toHaveBeenCalledWith('conv-123', 'Hello');
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(result);
  });

  it('returns 400 when message is missing', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockRequest.body = {};

    await handler(
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockUseCase.execute).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Message is required',
    });
  });

  it('returns 500 when use case throws', async () => {
    mockRequest.params = { conversationId: 'conv-123' };
    mockRequest.body = { message: 'Hello' };
    mockUseCase.execute.mockRejectedValue(new Error('Not found'));

    await handler(
      mockRequest as Request,
      mockResponse as Response,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Not found' });
  });
});
