import { InMemoryConversationRepository } from './in-memory-conversation-repository';
import { Conversation } from '../../domain/entities/conversation';
import { Message, MessageSender } from '../../domain/entities/message';

describe('InMemoryConversationRepository', () => {
  let repository: InMemoryConversationRepository;

  beforeEach(() => {
    repository = new InMemoryConversationRepository();
  });

  it('should save and retrieve a conversation', async () => {
    const conversation = Conversation.create();
    const message = Message.create('Test', MessageSender.USER);
    conversation.addMessage(message);

    await repository.save(conversation);
    const retrieved = await repository.findById(conversation.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(conversation.id);
    expect(retrieved?.getMessages()).toHaveLength(1);
  });

  it('should return null for non-existent conversation', async () => {
    const result = await repository.findById('non-existent');
    expect(result).toBeNull();
  });
});
