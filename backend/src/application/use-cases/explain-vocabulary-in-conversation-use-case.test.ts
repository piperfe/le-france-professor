import { ExplainVocabularyInConversationUseCase } from './explain-vocabulary-in-conversation-use-case';
import { Message, MessageSender } from '../../domain/entities/message';
import { ServiceUnavailableError } from '../../domain/errors';

const mockConversationRepository = {
  findById: jest.fn(),
  save: jest.fn(),
  findAll: jest.fn(),
  getLastTutorMessage: jest.fn(),
};

const mockVocabularyService = {
  explainVocabulary: jest.fn(),
};

const mockVocabularyRepository = {
  save: jest.fn(),
  findByConversationId: jest.fn(),
};

const lastTutorMessage = new Message('msg-42', 'Tu aimes la cuisine française ?', MessageSender.TUTOR, new Date());

describe('ExplainVocabularyInConversationUseCase', () => {
  let useCase: ExplainVocabularyInConversationUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockVocabularyRepository.save.mockResolvedValue(undefined);
    mockVocabularyService.explainVocabulary.mockResolvedValue('Explication.');
    useCase = new ExplainVocabularyInConversationUseCase(
      mockConversationRepository as any,
      mockVocabularyService as any,
      mockVocabularyRepository as any,
    );
  });

  describe('context resolution', () => {
    it('resolves context from last tutor message', async () => {
      mockConversationRepository.getLastTutorMessage.mockResolvedValue(lastTutorMessage);

      await useCase.execute('conv-1', 'cuisine');

      expect(mockVocabularyService.explainVocabulary).toHaveBeenCalledWith(
        'cuisine',
        'Tu aimes la cuisine française ?',
      );
    });

    it('falls back to empty context when no tutor messages are available', async () => {
      mockConversationRepository.getLastTutorMessage.mockResolvedValue(null);

      await useCase.execute('conv-1', 'bonjour');

      expect(mockVocabularyService.explainVocabulary).toHaveBeenCalledWith('bonjour', '');
    });

    it('returns an error when context lookup fails', async () => {
      mockConversationRepository.getLastTutorMessage.mockRejectedValue(new Error('DB down'));

      const result = await useCase.execute('conv-1', 'bonjour');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('DB down');
      expect(mockVocabularyService.explainVocabulary).not.toHaveBeenCalled();
    });
  });

  describe('explanation and save', () => {
    it('links explanation to source message and returns explanation text', async () => {
      mockConversationRepository.getLastTutorMessage.mockResolvedValue(lastTutorMessage);
      mockVocabularyService.explainVocabulary.mockResolvedValue('«Cuisine» désigne l\'art de préparer des repas.');

      const result = await useCase.execute('conv-1', 'cuisine');

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe('«Cuisine» désigne l\'art de préparer des repas.');
      expect(mockVocabularyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'cuisine',
          explanation: '«Cuisine» désigne l\'art de préparer des repas.',
          sourceMessageId: 'msg-42',
          conversationId: 'conv-1',
        }),
      );
    });

    it('saves without source link when conversation has no prior tutor reply', async () => {
      mockConversationRepository.getLastTutorMessage.mockResolvedValue(null);
      mockVocabularyService.explainVocabulary.mockResolvedValue('Explication.');

      await useCase.execute('conv-1', 'bonjour');

      expect(mockVocabularyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ sourceMessageId: '' }),
      );
    });
  });

  describe('unavailability', () => {
    it('returns an error when LLM is unavailable', async () => {
      mockConversationRepository.getLastTutorMessage.mockResolvedValue(null);
      mockVocabularyService.explainVocabulary.mockRejectedValue(new Error('LLM timeout'));

      const result = await useCase.execute('conv-1', 'bonjour');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('LLM timeout');
      expect(mockVocabularyRepository.save).not.toHaveBeenCalled();
    });

    it('returns an error when vocabulary cannot be saved', async () => {
      mockConversationRepository.getLastTutorMessage.mockResolvedValue(null);
      mockVocabularyRepository.save.mockRejectedValue(new Error('DB error'));

      const result = await useCase.execute('conv-1', 'bonjour');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().message).toBe('DB error');
    });
  });
});
