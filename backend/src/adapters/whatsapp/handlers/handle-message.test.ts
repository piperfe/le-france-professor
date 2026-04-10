import { Request, Response } from 'express';
import { okAsync, errAsync } from 'neverthrow';
import { HandleWhatsAppMessageUseCase } from '../../../application/use-cases/handle-whatsapp-message-use-case';
import { createHandleMessageHandler } from './handle-message';
import { ServiceUnavailableError } from '../../../domain/errors';

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

  it('returns 200 when message is handled successfully', async () => {
    mockRequest.body = metaBody('+56967022669', 'Bonjour');
    mockUseCase.execute.mockReturnValue(okAsync(undefined));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockUseCase.execute).toHaveBeenCalledWith('+56967022669', 'Bonjour');
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({ status: 'ok' });
  });

  it('returns 503 when use case fails', async () => {
    mockRequest.body = metaBody('+56967022669', 'Bonjour');
    mockUseCase.execute.mockReturnValue(errAsync(new ServiceUnavailableError('LLM down')));

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(503);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'LLM down' });
  });

  it('returns 200 for Meta status update events', async () => {
    mockRequest.body = { entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.xxx', status: 'delivered' }] } }] }] };

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns 200 for non-text messages such as images', async () => {
    mockRequest.body = { entry: [{ changes: [{ value: { messages: [{ from: '+56967022669', type: 'image' }] } }] }] };

    await handler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockUseCase.execute).not.toHaveBeenCalled();
  });
});
