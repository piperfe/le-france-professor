import { describe, it, expect } from 'vitest';
import { Message, MessageSender } from './message';

describe('Message', () => {
  it('should create message from API response', () => {
    const apiResponse = {
      id: 'msg-1',
      content: 'Bonjour',
      sender: MessageSender.TUTOR,
      timestamp: '2024-01-01T00:00:00Z',
    };
    const message = Message.fromApi(apiResponse);
    expect(message.id).toBe('msg-1');
    expect(message.content).toBe('Bonjour');
    expect(message.sender).toBe(MessageSender.TUTOR);
    expect(message.timestamp).toBeInstanceOf(Date);
  });
});
