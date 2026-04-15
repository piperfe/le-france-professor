import { Request, Response } from 'express';
import { okAsync, errAsync } from 'neverthrow';
import { HandleWhatsAppMessageUseCase } from '../../../application/use-cases/handle-whatsapp-message-use-case';
import { HandleWhatsAppVoiceUseCase } from '../../../application/use-cases/handle-whatsapp-voice-use-case';
import { ServiceUnavailableError } from '../../../domain/errors';
import { createHandleMessageHandler } from './handle-message';

function textBody(from: string, body: string) {
  return {
    entry: [{ changes: [{ value: { messages: [{ from, type: 'text', text: { body } }] } }] }],
  };
}

function audioBody(from: string, mediaId: string) {
  return {
    entry: [{ changes: [{ value: { messages: [{ from, type: 'audio', audio: { id: mediaId } }] } }] }],
  };
}

describe('createHandleMessageHandler', () => {
  let mockMessageUseCase: jest.Mocked<HandleWhatsAppMessageUseCase>;
  let mockVoiceUseCase: jest.Mocked<HandleWhatsAppVoiceUseCase>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let handler: ReturnType<typeof createHandleMessageHandler>;

  beforeEach(() => {
    mockMessageUseCase = { execute: jest.fn() } as any;
    mockVoiceUseCase = { execute: jest.fn() } as any;
    mockRequest = { body: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    handler = createHandleMessageHandler(mockMessageUseCase, mockVoiceUseCase);
  });

  describe('text messages', () => {
    it('returns 200 immediately and fires the text use case', () => {
      mockRequest.body = textBody('+10000000001', 'Bonjour');
      mockMessageUseCase.execute.mockReturnValue(okAsync(undefined));

      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ status: 'ok' });
      expect(mockMessageUseCase.execute).toHaveBeenCalledWith('+10000000001', 'Bonjour');
      expect(mockVoiceUseCase.execute).not.toHaveBeenCalled();
    });

    it('still returns 200 when the text use case fails — Meta must not retry', () => {
      mockRequest.body = textBody('+10000000001', 'Bonjour');
      mockMessageUseCase.execute.mockReturnValue(errAsync(new ServiceUnavailableError('LLM down')));

      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockMessageUseCase.execute).toHaveBeenCalledWith('+10000000001', 'Bonjour');
    });
  });

  describe('audio messages', () => {
    it('returns 200 immediately and fires the voice use case', () => {
      mockRequest.body = audioBody('+10000000001', 'media-id-abc123');
      mockVoiceUseCase.execute.mockReturnValue(okAsync(undefined));

      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ status: 'ok' });
      expect(mockVoiceUseCase.execute).toHaveBeenCalledWith('+10000000001', 'media-id-abc123');
      expect(mockMessageUseCase.execute).not.toHaveBeenCalled();
    });

    it('still returns 200 when the voice use case fails — Meta must not retry', () => {
      mockRequest.body = audioBody('+10000000001', 'media-id-abc123');
      mockVoiceUseCase.execute.mockReturnValue(errAsync(new ServiceUnavailableError('whisper down')));

      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockVoiceUseCase.execute).toHaveBeenCalledWith('+10000000001', 'media-id-abc123');
    });
  });

  describe('ignored events', () => {
    it('returns 200 for Meta status update events', () => {
      mockRequest.body = { entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.xxx', status: 'delivered' }] } }] }] };

      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockMessageUseCase.execute).not.toHaveBeenCalled();
      expect(mockVoiceUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns 200 for unsupported message types such as images', () => {
      mockRequest.body = { entry: [{ changes: [{ value: { messages: [{ from: '+10000000001', type: 'image' }] } }] }] };

      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockMessageUseCase.execute).not.toHaveBeenCalled();
      expect(mockVoiceUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
