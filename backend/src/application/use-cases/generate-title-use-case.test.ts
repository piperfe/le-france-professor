import { GenerateTitleUseCase } from './generate-title-use-case';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';
import { TitleService } from '../../domain/services/title-service';
import { Conversation } from '../../domain/entities/conversation';
import { Message, MessageSender } from '../../domain/entities/message';
import { ServiceUnavailableError } from '../../domain/errors';

describe('GenerateTitleUseCase', () => {
  let mockRepository: jest.Mocked<ConversationRepository>;
  let mockTitleService: jest.Mocked<TitleService>;
  let useCase: GenerateTitleUseCase;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    };
    mockTitleService = { generateTitle: jest.fn() };
    useCase = new GenerateTitleUseCase(mockRepository, mockTitleService);
  });

  it('generates title, sets it on conversation, and saves', async () => {
    const conv = Conversation.create();
    conv.addMessage(Message.create('Salut !', MessageSender.TUTOR));
    conv.addMessage(Message.create('Ça va ?', MessageSender.USER));
    conv.addMessage(Message.create('Bien, merci !', MessageSender.TUTOR));
    conv.addMessage(Message.create("J'aime la cuisine française", MessageSender.USER));
    mockRepository.findById.mockResolvedValue(conv);
    mockRepository.save.mockResolvedValue();
    mockTitleService.generateTitle.mockResolvedValue('La cuisine française en France');

    const result = await useCase.execute(conv.id);

    expect(result.isOk()).toBe(true);
    expect(mockTitleService.generateTitle).toHaveBeenCalledWith(conv.getMessages());
    expect(conv.title).toBe('La cuisine française en France');
    expect(mockRepository.save).toHaveBeenCalledWith(conv);
  });

  it('does nothing if conversation already has a title', async () => {
    const conv = Conversation.create();
    conv.setTitle('Titre existant');
    mockRepository.findById.mockResolvedValue(conv);

    const result = await useCase.execute(conv.id);

    expect(result.isOk()).toBe(true);
    expect(mockTitleService.generateTitle).not.toHaveBeenCalled();
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('does nothing if conversation is not found', async () => {
    mockRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute('unknown-id');

    expect(result.isOk()).toBe(true);
    expect(mockTitleService.generateTitle).not.toHaveBeenCalled();
  });

  it('returns err when title service fails', async () => {
    const conv = Conversation.create();
    conv.addMessage(Message.create('Salut !', MessageSender.TUTOR));
    mockRepository.findById.mockResolvedValue(conv);
    mockTitleService.generateTitle.mockRejectedValue(new Error('LLM timeout'));

    const result = await useCase.execute(conv.id);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError);
      expect(result.error.message).toBe('LLM timeout');
    }
  });
});
