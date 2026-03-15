import { SendMessageUseCase } from './send-message-use-case';
import { GenerateTitleUseCase } from './generate-title-use-case';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';
import { TutorService } from '../../domain/services/tutor-service';
import { Conversation } from '../../domain/entities/conversation';
import { Message, MessageSender } from '../../domain/entities/message';
import { NotFoundError, ServiceUnavailableError } from '../../domain/errors';
import { okAsync } from 'neverthrow';

describe('SendMessageUseCase', () => {
  let mockRepository: jest.Mocked<ConversationRepository>;
  let mockTutorService: jest.Mocked<TutorService>;
  let mockGenerateTitleUseCase: jest.Mocked<GenerateTitleUseCase>;
  let useCase: SendMessageUseCase;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    };
    mockTutorService = {
      initiateConversation: jest.fn(),
      generateResponse: jest.fn(),
    };
    mockGenerateTitleUseCase = { execute: jest.fn().mockReturnValue(okAsync(undefined)) } as any;
    useCase = new SendMessageUseCase(mockRepository, mockTutorService, mockGenerateTitleUseCase);
  });

  it('should return ok with message and tutor response', async () => {
    const conversation = Conversation.create();
    conversation.addMessage(Message.create('Bonjour !', MessageSender.TUTOR));
    mockRepository.findById.mockResolvedValue(conversation);
    mockRepository.save.mockResolvedValue();
    mockTutorService.generateResponse.mockResolvedValue('Très bien, merci !');

    const result = await useCase.execute('conv-1', 'Je vais bien');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.message).toBe('Je vais bien');
      expect(result.value.tutorResponse).toBe('Très bien, merci !');
    }
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should pass full conversation history to tutor service', async () => {
    const conversation = Conversation.create();
    conversation.addMessage(Message.create('Bonjour ! Comment allez-vous ?', MessageSender.TUTOR));
    mockRepository.findById.mockResolvedValue(conversation);
    mockRepository.save.mockResolvedValue();
    mockTutorService.generateResponse.mockResolvedValue('Très bien, merci !');

    await useCase.execute('conv-1', 'Je vais bien');

    expect(mockTutorService.generateResponse).toHaveBeenCalledWith(
      ['Bonjour ! Comment allez-vous ?', 'Je vais bien'],
      'Je vais bien',
    );
  });

  it('should return err with NotFoundError when conversation does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute('conv-1', 'Hello');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(NotFoundError);
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('should return err with ServiceUnavailableError when tutor service fails', async () => {
    const conversation = Conversation.create();
    conversation.addMessage(Message.create('Bonjour !', MessageSender.TUTOR));
    mockRepository.findById.mockResolvedValue(conversation);
    mockTutorService.generateResponse.mockRejectedValue(new Error('LLM timeout'));

    const result = await useCase.execute('conv-1', 'Hello');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ServiceUnavailableError);
      expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(result.error.message).toBe('LLM timeout');
    }
  });

  it('should trigger title generation after second user message', async () => {
    const conversation = Conversation.create();
    conversation.addMessage(Message.create('Salut !', MessageSender.TUTOR));
    conversation.addMessage(Message.create('Ça va ?', MessageSender.USER));
    conversation.addMessage(Message.create('Bien, merci !', MessageSender.TUTOR));
    mockRepository.findById.mockResolvedValue(conversation);
    mockRepository.save.mockResolvedValue();
    mockTutorService.generateResponse.mockResolvedValue('Super !');

    await useCase.execute('conv-1', 'J\'aime la cuisine française');

    expect(mockGenerateTitleUseCase.execute).toHaveBeenCalledWith('conv-1');
  });

  it('should not trigger title generation after first user message', async () => {
    const conversation = Conversation.create();
    conversation.addMessage(Message.create('Salut !', MessageSender.TUTOR));
    mockRepository.findById.mockResolvedValue(conversation);
    mockRepository.save.mockResolvedValue();
    mockTutorService.generateResponse.mockResolvedValue('Bien, merci !');

    await useCase.execute('conv-1', 'Ça va ?');

    expect(mockGenerateTitleUseCase.execute).not.toHaveBeenCalled();
  });

  it('should not trigger title generation when title is already set', async () => {
    const conversation = Conversation.create();
    conversation.addMessage(Message.create('Salut !', MessageSender.TUTOR));
    conversation.addMessage(Message.create('Ça va ?', MessageSender.USER));
    conversation.addMessage(Message.create('Bien !', MessageSender.TUTOR));
    conversation.setTitle('La cuisine française avec Sophie');
    mockRepository.findById.mockResolvedValue(conversation);
    mockRepository.save.mockResolvedValue();
    mockTutorService.generateResponse.mockResolvedValue('Super !');

    await useCase.execute('conv-1', 'J\'aime la cuisine');

    expect(mockGenerateTitleUseCase.execute).not.toHaveBeenCalled();
  });
});
