import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpConversationRepository } from './http-conversation-repository';
import { MessageSender } from '../../domain/entities/message';

describe('HttpConversationRepository', () => {
  let repository: HttpConversationRepository;
  const baseUrl = 'http://localhost:3001/api';

  beforeEach(() => {
    repository = new HttpConversationRepository(baseUrl);
    global.fetch = vi.fn();
  });

  it('should create a conversation', async () => {
    const mockResponse = {
      conversationId: 'conv-1',
      initialMessage: 'Bonjour !',
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await repository.create();

    expect(result.conversationId).toBe('conv-1');
    expect(result.initialMessage).toBe('Bonjour !');
    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/conversations`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('should send a message', async () => {
    const mockResponse = {
      message: 'Hello',
      tutorResponse: 'Bonjour !',
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await repository.sendMessage('conv-1', 'Hello');

    expect(result.message).toBe('Hello');
    expect(result.tutorResponse).toBe('Bonjour !');
  });
});
