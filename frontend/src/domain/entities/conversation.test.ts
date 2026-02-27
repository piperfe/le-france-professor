import { describe, it, expect } from 'vitest';
import { Conversation } from './conversation';
import { Message, MessageSender } from './message';

describe('Conversation', () => {
  it('should create conversation from API response', () => {
    const apiResponse = {
      id: 'conv-1',
      messages: [
        {
          id: 'msg-1',
          content: 'Bonjour',
          sender: MessageSender.TUTOR,
          timestamp: '2024-01-01T00:00:00Z',
        },
      ],
      createdAt: '2024-01-01T00:00:00Z',
    };
    const conversation = Conversation.fromApi(apiResponse);
    expect(conversation.id).toBe('conv-1');
    expect(conversation.messages).toHaveLength(1);
    expect(conversation.createdAt).toBeInstanceOf(Date);
  });

  it('should add message to conversation', () => {
    const conversation = Conversation.fromApi({
      id: 'conv-1',
      messages: [],
      createdAt: '2024-01-01T00:00:00Z',
    });
    const message = Message.fromApi({
      id: 'msg-1',
      content: 'Test',
      sender: MessageSender.USER,
      timestamp: '2024-01-01T00:00:00Z',
    });
    const updated = conversation.addMessage(message);
    expect(updated.messages).toHaveLength(1);
    expect(updated.messages[0].content).toBe('Test');
  });
});
