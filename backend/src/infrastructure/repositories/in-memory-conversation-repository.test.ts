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

  it('should return all saved conversations', async () => {
    const conv1 = Conversation.create();
    const conv2 = Conversation.create();
    await repository.save(conv1);
    await repository.save(conv2);

    const all = await repository.findAll();

    expect(all).toHaveLength(2);
    expect(all.map((c) => c.id)).toContain(conv1.id);
    expect(all.map((c) => c.id)).toContain(conv2.id);
  });

  it('should return empty array when no conversations exist', async () => {
    const all = await repository.findAll();
    expect(all).toEqual([]);
  });
});
