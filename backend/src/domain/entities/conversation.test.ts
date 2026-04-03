import { Conversation } from './conversation';
import { Message, MessageSender } from './message';

describe('Conversation', () => {
  it('starts with no messages', () => {
    const conversation = Conversation.create();
    expect(conversation.id).toBeDefined();
    expect(conversation.getMessages()).toHaveLength(0);
    expect(conversation.createdAt).toBeInstanceOf(Date);
  });

  it('preserves message order as messages are added', () => {
    const conversation = Conversation.create();
    const message1 = Message.create('Hello', MessageSender.USER);
    const message2 = Message.create('Bonjour', MessageSender.TUTOR);
    conversation.addMessage(message1);
    conversation.addMessage(message2);
    expect(conversation.getMessages()).toHaveLength(2);
  });

  it('returns null as last message when empty, otherwise the most recent one', () => {
    const conversation = Conversation.create();
    expect(conversation.getLastMessage()).toBeNull();
    const message = Message.create('Test', MessageSender.USER);
    conversation.addMessage(message);
    expect(conversation.getLastMessage()).toBe(message);
  });

  describe('title', () => {
    it('has no title when first created', () => {
      expect(Conversation.create().isTitleGenerated()).toBe(false);
    });

    it('recognises when a title has been generated', () => {
      const conv = Conversation.create();
      conv.setTitle('La musique française');
      expect(conv.isTitleGenerated()).toBe(true);
    });
  });

  describe('topic', () => {
    it('has no topic when first created', () => {
      expect(Conversation.create().isTopicDiscovered()).toBe(false);
    });

    it('recognises when a topic has been discovered', () => {
      const conv = Conversation.create();
      conv.setTopic('musique');
      expect(conv.isTopicDiscovered()).toBe(true);
      expect(conv.topic).toBe('musique');
    });
  });

  describe('phase', () => {
    function addExchange(conv: Conversation, n: number): void {
      for (let i = 0; i < n; i++) {
        conv.addMessage(Message.create('Bonjour', MessageSender.TUTOR));
        conv.addMessage(Message.create('Salut', MessageSender.USER));
      }
    }

    it('starts in calibration before the student has spoken', () => {
      expect(Conversation.create().phase()).toBe('calibration');
    });

    it('stays in calibration for the first four student messages', () => {
      const conv = Conversation.create();
      addExchange(conv, 4);
      expect(conv.phase()).toBe('calibration');
    });

    it('switches to flow from the fifth student message', () => {
      const conv = Conversation.create();
      addExchange(conv, 5);
      expect(conv.phase()).toBe('flow');
    });
  });
});
