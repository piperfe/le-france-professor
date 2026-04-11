import { Request, Response } from 'express';
import { okAsync } from 'neverthrow';
import { HandleWhatsAppMessageUseCase } from '../../../application/use-cases/handle-whatsapp-message-use-case';
import { createHandleMessageHandler } from './handle-message';

function metaBody(from: string, body: string) {
  return {
    entry: [{ changes: [{ value: { messages: [{ from, type: 'text', text: { body } }] } }] }],
  };
}

describe('createHandleMessageHandler', () => {
  let mockUseCase: jest.Mocked<HandleWhatsAppMessageUseCase>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let handler: ReturnType<typeof createHandleMessageHandler>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() } as any;
    mockRequest = { body: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    handler = createHandleMessageHandler(mockUseCase);
  });

  it('returns 200 immediately and fires use case without awaiting', () => {
    mockRequest.body = metaBody('+56967022669', 'Bonjour');
    mockUseCase.execute.mockReturnValue(okAsync(undefined));

    handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({ status: 'ok' });
    expect(mockUseCase.execute).toHaveBeenCalledWith('+56967022669', 'Bonjour');
  });

  it('returns 200 for Meta status update events', () => {
    mockRequest.body = { entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.xxx', status: 'delivered' }] } }] }] };

    handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns 200 for non-text messages such as images', () => {
    mockRequest.body = { entry: [{ changes: [{ value: { messages: [{ from: '+56967022669', type: 'image' }] } }] }] };

    handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockUseCase.execute).not.toHaveBeenCalled();
  });
});
