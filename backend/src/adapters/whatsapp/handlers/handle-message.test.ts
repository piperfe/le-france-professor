import { Request, Response } from 'express';
import { okAsync, errAsync } from 'neverthrow';
import { createHandleMessageHandler } from './handle-message';
import { ConversationStatus } from '../../../application/use-cases/start-or-resume-conversation-use-case';
import { ServiceUnavailableError } from '../../../domain/errors';

const flushAsync = () => new Promise<void>((r) => setTimeout(r, 10));

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

const mockStartOrResume = { execute: jest.fn() };
const mockSendMessage = { execute: jest.fn() };
const mockWhatsAppSender = { sendMessage: jest.fn(), sendDocument: jest.fn() };
const mockCommandA = { trigger: /^\/command-a/i, usage: '/command-a [arg]', execute: jest.fn() };
const mockCommandB = { trigger: /^\/command-b/i, usage: '/command-b [all]', execute: jest.fn() };
const mockVoiceTranscriber = { transcribe: jest.fn() };

describe('createHandleMessageHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let handler: ReturnType<typeof createHandleMessageHandler>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWhatsAppSender.sendMessage.mockResolvedValue(undefined);
    mockRequest = { body: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    handler = createHandleMessageHandler(
      mockStartOrResume as any,
      mockSendMessage as any,
      mockWhatsAppSender,
      [mockCommandA, mockCommandB],
      mockVoiceTranscriber as any,
    );
  });

  describe('HTTP behavior', () => {
    it('always returns 200 immediately for text messages', () => {
      mockRequest.body = textBody('+10000000001', 'Bonjour');
      mockStartOrResume.execute.mockReturnValue(
        okAsync({ status: ConversationStatus.RESUMED, conversationId: 'conv-1' }),
      );
      mockSendMessage.execute.mockReturnValue(okAsync({ tutorResponse: 'Salut !' }));

      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ status: 'ok' });
    });

    it('returns 200 for Meta status update events', () => {
      mockRequest.body = { entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.xxx' }] } }] }] };

      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockStartOrResume.execute).not.toHaveBeenCalled();
    });

    it('returns 200 for unsupported message types such as images', () => {
      mockRequest.body = { entry: [{ changes: [{ value: { messages: [{ from: '+1', type: 'image' }] } }] }] };

      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockStartOrResume.execute).not.toHaveBeenCalled();
    });

    it('still returns 200 when session resolution fails — Meta must not retry', () => {
      mockRequest.body = textBody('+10000000001', 'Bonjour');
      mockStartOrResume.execute.mockReturnValue(errAsync(new ServiceUnavailableError('DB down')));

      handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('audio messages', () => {
    it('voice note is transcribed and delivered as a text message', async () => {
      mockRequest.body = audioBody('+10000000001', 'media-id-abc');
      mockVoiceTranscriber.transcribe.mockReturnValue(okAsync('Bonjour transcrit !'));
      mockStartOrResume.execute.mockReturnValue(
        okAsync({ status: ConversationStatus.RESUMED, conversationId: 'conv-1' }),
      );
      mockSendMessage.execute.mockReturnValue(okAsync({ tutorResponse: 'Salut !' }));

      handler(mockRequest as Request, mockResponse as Response);
      await flushAsync();

      expect(mockVoiceTranscriber.transcribe).toHaveBeenCalledWith('media-id-abc');
      expect(mockStartOrResume.execute).toHaveBeenCalledWith('+10000000001');
      expect(mockSendMessage.execute).toHaveBeenCalledWith('conv-1', 'Bonjour transcrit !');
    });

    it('returns 200 even when transcription fails', async () => {
      mockRequest.body = audioBody('+10000000001', 'media-id-abc');
      mockVoiceTranscriber.transcribe.mockReturnValue(errAsync(new ServiceUnavailableError('Whisper unavailable')));

      handler(mockRequest as Request, mockResponse as Response);
      await flushAsync();

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockWhatsAppSender.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('new phone (STARTED)', () => {
    it('sends greeting and discards the message text', async () => {
      mockRequest.body = textBody('+10000000001', 'Salut');
      mockStartOrResume.execute.mockReturnValue(
        okAsync({ status: ConversationStatus.STARTED, conversationId: 'conv-new', initialMessage: 'Bonjour ! Je suis Sophie.' }),
      );

      handler(mockRequest as Request, mockResponse as Response);
      await flushAsync();

      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith('+10000000001', 'Bonjour ! Je suis Sophie.');
      expect(mockSendMessage.execute).not.toHaveBeenCalled();
    });

    it('discards a command for a new phone and sends greeting only', async () => {
      mockRequest.body = textBody('+10000000001', '/command-a');
      mockStartOrResume.execute.mockReturnValue(
        okAsync({ status: ConversationStatus.STARTED, conversationId: 'conv-new', initialMessage: 'Bonjour !' }),
      );

      handler(mockRequest as Request, mockResponse as Response);
      await flushAsync();

      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith('+10000000001', 'Bonjour !');
      expect(mockCommandA.execute).not.toHaveBeenCalled();
    });
  });

  describe('existing phone — plain text (RESUMED)', () => {
    it('delivers tutor response to returning sender', async () => {
      mockRequest.body = textBody('+10000000001', 'Je veux parler de cuisine');
      mockStartOrResume.execute.mockReturnValue(
        okAsync({ status: ConversationStatus.RESUMED, conversationId: 'conv-456' }),
      );
      mockSendMessage.execute.mockReturnValue(
        okAsync({ tutorResponse: 'La cuisine française est délicieuse !' }),
      );

      handler(mockRequest as Request, mockResponse as Response);
      await flushAsync();

      expect(mockSendMessage.execute).toHaveBeenCalledWith('conv-456', 'Je veux parler de cuisine');
      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith('+10000000001', 'La cuisine française est délicieuse !');
    });
  });

  describe('existing phone — command routing (RESUMED)', () => {
    beforeEach(() => {
      mockStartOrResume.execute.mockReturnValue(
        okAsync({ status: ConversationStatus.RESUMED, conversationId: 'conv-456' }),
      );
    });

    it('dispatches /command-a to the matching command', async () => {
      mockRequest.body = textBody('+10000000001', '/command-a');
      mockCommandA.execute.mockReturnValue(okAsync(undefined));

      handler(mockRequest as Request, mockResponse as Response);
      await flushAsync();

      expect(mockCommandA.execute).toHaveBeenCalledWith('+10000000001', 'conv-456', '/command-a');
      expect(mockCommandB.execute).not.toHaveBeenCalled();
    });

    it('dispatches /command-b to the matching command', async () => {
      mockRequest.body = textBody('+10000000001', '/command-b all');
      mockCommandB.execute.mockReturnValue(okAsync(undefined));

      handler(mockRequest as Request, mockResponse as Response);
      await flushAsync();

      expect(mockCommandB.execute).toHaveBeenCalledWith('+10000000001', 'conv-456', '/command-b all');
      expect(mockCommandA.execute).not.toHaveBeenCalled();
    });

    it('sends unknown command reply with dynamic usage list', async () => {
      mockRequest.body = textBody('+10000000001', '/unknown');

      handler(mockRequest as Request, mockResponse as Response);
      await flushAsync();

      expect(mockWhatsAppSender.sendMessage).toHaveBeenCalledWith(
        '+10000000001',
        'Commande inconnue. Commandes disponibles : /command-a [arg] · /command-b [all]',
      );
      expect(mockCommandA.execute).not.toHaveBeenCalled();
      expect(mockCommandB.execute).not.toHaveBeenCalled();
    });

    it('does not reply when a command fails', async () => {
      mockRequest.body = textBody('+10000000001', '/command-a');
      mockCommandA.execute.mockReturnValue(errAsync(new ServiceUnavailableError('Command failed')));

      handler(mockRequest as Request, mockResponse as Response);
      await flushAsync();

      expect(mockCommandA.execute).toHaveBeenCalled();
      expect(mockWhatsAppSender.sendMessage).not.toHaveBeenCalled();
    });
  });
});
