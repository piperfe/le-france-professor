import { Conversation } from './conversation';
import { Message, MessageSender } from './message';

describe('Conversation', () => {
  it('should create an empty conversation', () => {
    const conversation = Conversation.create();
    expect(conversation.id).toBeDefined();
    expect(conversation.getMessages()).toHaveLength(0);
    expect(conversation.createdAt).toBeInstanceOf(Date);
  });

  it('should add messages to conversation', () => {
    const conversation = Conversation.create();
    const message1 = Message.create('Hello', MessageSender.USER);
    const message2 = Message.create('Bonjour', MessageSender.TUTOR);
    conversation.addMessage(message1);
    conversation.addMessage(message2);
    expect(conversation.getMessages()).toHaveLength(2);
  });

  it('should return last message', () => {
    const conversation = Conversation.create();
    expect(conversation.getLastMessage()).toBeNull();
    const message = Message.create('Test', MessageSender.USER);
    conversation.addMessage(message);
    expect(conversation.getLastMessage()).toBe(message);
  });
});
