import { Message, MessageSender } from './message';

describe('Message', () => {
  it('should create a message with user sender', () => {
    const content = 'Bonjour';
    const sender = MessageSender.USER;
    const message = Message.create(content, sender);
    expect(message.content).toBe(content);
    expect(message.sender).toBe(sender);
    expect(message.id).toBeDefined();
    expect(message.timestamp).toBeInstanceOf(Date);
  });

  it('should create a message with tutor sender', () => {
    const content = 'Bonjour ! Comment allez-vous ?';
    const sender = MessageSender.TUTOR;
    const message = Message.create(content, sender);
    expect(message.content).toBe(content);
    expect(message.sender).toBe(sender);
  });
});
