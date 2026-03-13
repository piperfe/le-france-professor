import nock from 'nock';
import { OllamaVocabularyService } from './ollama-vocabulary-service';

const BASE_URL = 'http://localhost:9999';
const CHAT_PATH = '/v1/chat/completions';

function createMockChatResponse(content: string | null) {
  return {
    id: 'test-id',
    object: 'chat.completion',
    created: 1234567890,
    model: 'llama2',
    choices: content !== null
      ? [{ index: 0, message: { role: 'assistant' as const, content }, finish_reason: 'stop' }]
      : [],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  };
}

describe('OllamaVocabularyService', () => {
  let service: OllamaVocabularyService;

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    service = new OllamaVocabularyService({ baseURL: `${BASE_URL}/v1`, model: 'llama2' });
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('explainVocabulary', () => {
    it('returns the LLM explanation when the API returns content', async () => {
      const explanation = '«Passée» est le participe passé féminin du verbe «se passer».';
      nock(BASE_URL).post(CHAT_PATH).reply(200, createMockChatResponse(explanation));

      const result = await service.explainVocabulary('passée', "Comment s'est passée ta journée ?");

      expect(result).toBe(explanation);
    });

    it('returns default message when API returns empty choices', async () => {
      nock(BASE_URL).post(CHAT_PATH).reply(200, createMockChatResponse(null));

      const result = await service.explainVocabulary('passée', '');

      expect(result).toBe('Je ne peux pas expliquer ce mot pour le moment.');
    });

    it('sends system prompt focused on linguistic explanation without questions', async () => {
      let capturedBody: unknown = null;
      nock(BASE_URL)
        .post(CHAT_PATH, (body) => { capturedBody = body; return true; })
        .reply(200, createMockChatResponse('Explication.'));

      await service.explainVocabulary('passée', '');

      expect(capturedBody).toMatchObject({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('Ne pose pas de question'),
          }),
        ]),
      });
    });

    it('includes the context phrase in the user message when context is provided', async () => {
      let capturedBody: unknown = null;
      nock(BASE_URL)
        .post(CHAT_PATH, (body) => { capturedBody = body; return true; })
        .reply(200, createMockChatResponse('Explication.'));

      const context = "Comment s'est passée ta journée ?";
      await service.explainVocabulary('passée', context);

      expect(capturedBody).toMatchObject({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining(context),
          }),
        ]),
      });
    });

    it('sends a context-free user message when context is empty', async () => {
      let capturedBody: unknown = null;
      nock(BASE_URL)
        .post(CHAT_PATH, (body) => { capturedBody = body; return true; })
        .reply(200, createMockChatResponse('Explication.'));

      await service.explainVocabulary('bonjour', '');

      const userMessage = (capturedBody as any).messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).not.toContain('Dans la phrase');
      expect(userMessage.content).toContain('bonjour');
    });

    it('uses temperature 0.3 for deterministic explanations', async () => {
      let capturedBody: unknown = null;
      nock(BASE_URL)
        .post(CHAT_PATH, (body) => { capturedBody = body; return true; })
        .reply(200, createMockChatResponse('Explication.'));

      await service.explainVocabulary('passée', '');

      expect(capturedBody).toMatchObject({ temperature: 0.3 });
    });
  });
});
