import { SendMessageUseCase } from './send-message-use-case';
import { GenerateTitleUseCase } from './generate-title-use-case';
import { ExtractTopicUseCase } from './extract-topic-use-case';
import { ConversationRepository } from '../../domain/repositories/conversation-repository';
import { TutorService } from '../../domain/services/tutor-service';
import { Conversation } from '../../domain/entities/conversation';
import { Message, MessageSender } from '../../domain/entities/message';
import { NotFoundError, ServiceUnavailableError } from '../../domain/errors';
import { okAsync } from 'neverthrow';

function conversationWithExchanges(n: number): Conversation {
  const conversation = Conversation.create();
  conversation.addMessage(Message.create('Salut !', MessageSender.TUTOR));
  for (let i = 0; i < n; i++) {
    conversation.addMessage(Message.create('Message', MessageSender.USER));
    conversation.addMessage(Message.create('Réponse', MessageSender.TUTOR));
  }
  return conversation;
}

describe('SendMessageUseCase', () => {
  let mockRepository: jest.Mocked<ConversationRepository>;
  let mockTutorService: jest.Mocked<TutorService>;
  let mockGenerateTitleUseCase: jest.Mocked<GenerateTitleUseCase>;
  let mockExtractTopicUseCase: jest.Mocked<ExtractTopicUseCase>;
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
      extractTopic: jest.fn(),
    };
    mockGenerateTitleUseCase = { execute: jest.fn().mockReturnValue(okAsync(undefined)) } as any;
    mockExtractTopicUseCase = { execute: jest.fn().mockReturnValue(okAsync(undefined)) } as any;
    useCase = new SendMessageUseCase(
      mockRepository,
      mockTutorService,
      mockGenerateTitleUseCase,
      mockExtractTopicUseCase,
    );
  });

  it('returns the student message and tutor response', async () => {
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
      expect(typeof result.value.messageId).toBe('string');
    }
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('sends the full conversation history to the tutor', async () => {
    const conversation = Conversation.create();
    conversation.addMessage(Message.create('Bonjour ! Comment allez-vous ?', MessageSender.TUTOR));
    mockRepository.findById.mockResolvedValue(conversation);
    mockRepository.save.mockResolvedValue();
    mockTutorService.generateResponse.mockResolvedValue('Très bien, merci !');

    await useCase.execute('conv-1', 'Je vais bien');

    expect(mockTutorService.generateResponse).toHaveBeenCalledWith(
      ['Bonjour ! Comment allez-vous ?', 'Je vais bien'],
      'Je vais bien',
      expect.any(Object),
    );
  });

  it('fails when the conversation does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute('conv-1', 'Hello');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(NotFoundError);
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('fails when the tutor is unavailable', async () => {
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

  describe('calibration and flow phases', () => {
    it('uses calibration prompt for the first student message', async () => {
      const conversation = Conversation.create();
      conversation.addMessage(Message.create('Salut !', MessageSender.TUTOR));
      mockRepository.findById.mockResolvedValue(conversation);
      mockRepository.save.mockResolvedValue();
      mockTutorService.generateResponse.mockResolvedValue('Cool !');

      await useCase.execute('conv-1', 'Ça va ?');

      expect(mockTutorService.generateResponse).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        { phase: 'calibration', topic: null },
      );
    });

    it('uses calibration prompt for the fourth student message', async () => {
      const conversation = conversationWithExchanges(3);
      mockRepository.findById.mockResolvedValue(conversation);
      mockRepository.save.mockResolvedValue();
      mockTutorService.generateResponse.mockResolvedValue('Super !');

      await useCase.execute('conv-1', 'Quatrième message');

      expect(mockTutorService.generateResponse).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        { phase: 'calibration', topic: null },
      );
    });

    it('uses flow prompt with the discovered topic from the fifth student message', async () => {
      const conversation = conversationWithExchanges(4);
      conversation.setTopic('musique');
      mockRepository.findById.mockResolvedValue(conversation);
      mockRepository.save.mockResolvedValue();
      mockTutorService.generateResponse.mockResolvedValue('Super !');

      await useCase.execute('conv-1', 'Cinquième message');

      expect(mockTutorService.generateResponse).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        { phase: 'flow', topic: 'musique' },
      );
    });

    it('uses flow prompt without topic anchor when no topic was discovered', async () => {
      const conversation = conversationWithExchanges(4);
      mockRepository.findById.mockResolvedValue(conversation);
      mockRepository.save.mockResolvedValue();
      mockTutorService.generateResponse.mockResolvedValue('Super !');

      await useCase.execute('conv-1', 'Cinquième message');

      expect(mockTutorService.generateResponse).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        { phase: 'flow', topic: null },
      );
    });
  });

  describe('title generation', () => {
    it('generates the conversation title after the second student message', async () => {
      const conversation = Conversation.create();
      conversation.addMessage(Message.create('Salut !', MessageSender.TUTOR));
      conversation.addMessage(Message.create('Ça va ?', MessageSender.USER));
      conversation.addMessage(Message.create('Bien, merci !', MessageSender.TUTOR));
      mockRepository.findById.mockResolvedValue(conversation);
      mockRepository.save.mockResolvedValue();
      mockTutorService.generateResponse.mockResolvedValue('Super !');

      await useCase.execute('conv-1', "J'aime la cuisine française");

      expect(mockGenerateTitleUseCase.execute).toHaveBeenCalledWith('conv-1');
    });

    it('does not generate title after the first student message', async () => {
      const conversation = Conversation.create();
      conversation.addMessage(Message.create('Salut !', MessageSender.TUTOR));
      mockRepository.findById.mockResolvedValue(conversation);
      mockRepository.save.mockResolvedValue();
      mockTutorService.generateResponse.mockResolvedValue('Bien, merci !');

      await useCase.execute('conv-1', 'Ça va ?');

      expect(mockGenerateTitleUseCase.execute).not.toHaveBeenCalled();
    });

    it('skips title generation when a title already exists', async () => {
      const conversation = Conversation.create();
      conversation.addMessage(Message.create('Salut !', MessageSender.TUTOR));
      conversation.addMessage(Message.create('Ça va ?', MessageSender.USER));
      conversation.addMessage(Message.create('Bien !', MessageSender.TUTOR));
      conversation.setTitle('La cuisine française avec Sophie');
      mockRepository.findById.mockResolvedValue(conversation);
      mockRepository.save.mockResolvedValue();
      mockTutorService.generateResponse.mockResolvedValue('Super !');

      await useCase.execute('conv-1', "J'aime la cuisine");

      expect(mockGenerateTitleUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('topic extraction', () => {
    it('extracts the topic after the fourth student message', async () => {
      const conversation = conversationWithExchanges(3);
      mockRepository.findById.mockResolvedValue(conversation);
      mockRepository.save.mockResolvedValue();
      mockTutorService.generateResponse.mockResolvedValue('Super !');

      await useCase.execute('conv-1', 'Quatrième message');

      expect(mockExtractTopicUseCase.execute).toHaveBeenCalledWith('conv-1');
    });

    it('does not extract topic before the fourth student message', async () => {
      const conversation = Conversation.create();
      conversation.addMessage(Message.create('Salut !', MessageSender.TUTOR));
      mockRepository.findById.mockResolvedValue(conversation);
      mockRepository.save.mockResolvedValue();
      mockTutorService.generateResponse.mockResolvedValue('Cool !');

      await useCase.execute('conv-1', 'Premier message');

      expect(mockExtractTopicUseCase.execute).not.toHaveBeenCalled();
    });

    it('skips topic extraction when the topic is already known', async () => {
      const conversation = conversationWithExchanges(3);
      conversation.setTopic('football');
      mockRepository.findById.mockResolvedValue(conversation);
      mockRepository.save.mockResolvedValue();
      mockTutorService.generateResponse.mockResolvedValue('Super !');

      await useCase.execute('conv-1', 'Quatrième message');

      expect(mockExtractTopicUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
