import { ExtractTopicUseCase } from './extract-topic-use-case';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';
import { TutorService } from '../../domain/services/tutor-service';
import { Conversation } from '../../domain/entities/conversation';
import { Message, MessageSender } from '../../domain/entities/message';
import { NotFoundError, ServiceUnavailableError } from '../../domain/errors';

describe('ExtractTopicUseCase', () => {
  let mockRepository: jest.Mocked<ConversationRepository>;
  let mockTutorService: jest.Mocked<TutorService>;
  let useCase: ExtractTopicUseCase;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    };
    mockTutorService = {
      initiateConversation: jest.fn(),
      generateResponse: jest.fn(),
      extractTopic: jest.fn(),
    };
    useCase = new ExtractTopicUseCase(mockRepository, mockTutorService);
  });

  it('stores the discovered topic on the conversation', async () => {
    const conv = Conversation.create();
    conv.addMessage(Message.create('Salut !', MessageSender.TUTOR));
    conv.addMessage(Message.create("J'adore la musique", MessageSender.USER));
    mockRepository.findById.mockResolvedValue(conv);
    mockRepository.save.mockResolvedValue();
    mockTutorService.extractTopic.mockResolvedValue('musique');

    const result = await useCase.execute(conv.id);

    expect(result.isOk()).toBe(true);
    expect(mockTutorService.extractTopic).toHaveBeenCalledWith(
      conv.getMessages().map((m) => m.content),
    );
    expect(conv.topic).toBe('musique');
    expect(mockRepository.save).toHaveBeenCalledWith(conv);
  });

  it('skips extraction when the topic is already known', async () => {
    const conv = Conversation.create();
    conv.setTopic('football');
    mockRepository.findById.mockResolvedValue(conv);

    const result = await useCase.execute(conv.id);

    expect(result.isOk()).toBe(true);
    expect(mockTutorService.extractTopic).not.toHaveBeenCalled();
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('fails when the conversation does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute('unknown-id');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(NotFoundError);
    }
  });

  it('fails when the LLM is unavailable during extraction', async () => {
    const conv = Conversation.create();
    conv.addMessage(Message.create('Salut !', MessageSender.TUTOR));
    mockRepository.findById.mockResolvedValue(conv);
    mockTutorService.extractTopic.mockRejectedValue(new Error('LLM timeout'));

    const result = await useCase.execute(conv.id);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError);
      expect(result.error.message).toBe('LLM timeout');
    }
  });

  it('fails when saving the topic fails', async () => {
    const conv = Conversation.create();
    conv.addMessage(Message.create('Salut !', MessageSender.TUTOR));
    conv.addMessage(Message.create("J'aime le cinéma", MessageSender.USER));
    mockRepository.findById.mockResolvedValue(conv);
    mockRepository.save.mockRejectedValue(new Error('DB write failed'));
    mockTutorService.extractTopic.mockResolvedValue('cinéma');

    const result = await useCase.execute(conv.id);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError);
      expect(result.error.message).toBe('DB write failed');
    }
  });
});
