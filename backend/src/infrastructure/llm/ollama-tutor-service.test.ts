import nock from 'nock';
import { OllamaTutorService } from './ollama-tutor-service';

const BASE_URL = 'http://localhost:9999';
const API_BASE = `${BASE_URL}/v1`;
const CHAT_PATH = '/v1/chat/completions';

function systemPromptFrom(body: unknown): string {
  return (body as { messages: Array<{ role: string; content: string }> }).messages[0].content;
}

function createMockChatResponse(content: string | null) {
  return {
    id: 'test-id',
    object: 'chat.completion',
    created: 1234567890,
    model: 'llama2',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant' as const,
          content,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  };
}

describe('OllamaTutorService', () => {
  let service: OllamaTutorService;

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    service = new OllamaTutorService({
      baseURL: `${API_BASE}`,
      model: 'llama2',
    });
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('initiateConversation', () => {
    it('returns the greeting from the tutor', async () => {
      const greeting = "Salut ! Dis-moi, t'es plutôt sport, musique, films… ou autre chose ?";
      nock(BASE_URL)
        .post(CHAT_PATH)
        .reply(200, createMockChatResponse(greeting));

      const result = await service.initiateConversation();

      expect(result).toBe(greeting);
    });

    it('falls back to default greeting when the LLM returns nothing', async () => {
      nock(BASE_URL)
        .post(CHAT_PATH)
        .reply(200, {
          ...createMockChatResponse(''),
          choices: [],
        });

      const result = await service.initiateConversation();

      expect(result).toBe("Salut ! Dis-moi, t'es plutôt sport, musique, films… ou autre chose ?");
    });

    it('opening message invites the student to share their interests', async () => {
      let capturedBody: unknown = null;
      nock(BASE_URL)
        .post(CHAT_PATH, (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, createMockChatResponse('Salut !'));

      await service.initiateConversation();

      expect(capturedBody).toMatchObject({
        model: 'llama2',
        messages: [
          { role: 'system', content: expect.stringContaining('ami français') },
          { role: 'user', content: expect.stringContaining('de quoi il aime parler') },
        ],
        max_tokens: 50,
      });
    });
  });

  describe('generateResponse', () => {
    it('returns the tutor response', async () => {
      const reply = 'Oui, le français est parlé sur plusieurs continents !';
      nock(BASE_URL)
        .post(CHAT_PATH)
        .reply(200, createMockChatResponse(reply));

      const result = await service.generateResponse(
        ['Bonjour', 'Parlez-vous français ?'],
        'Où parle-t-on français ?',
        { phase: 'flow', topic: null },
      );

      expect(result).toBe(reply);
    });

    it('falls back to default response when the LLM returns nothing', async () => {
      nock(BASE_URL)
        .post(CHAT_PATH)
        .reply(200, createMockChatResponse(''));

      const result = await service.generateResponse([], 'Question?', { phase: 'flow', topic: null });

      expect(result).toBe("Ah ouais ? Raconte !");
    });

    it('discovery prompt focuses on finding the student\'s interest', async () => {
      let capturedBody: unknown = null;
      nock(BASE_URL)
        .post(CHAT_PATH, (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, createMockChatResponse('Cool !'));

      await service.generateResponse(['Bonjour'], 'J\'aime la musique', { phase: 'calibration', topic: null });

      expect(capturedBody).toMatchObject({
        messages: expect.arrayContaining([
          { role: 'system', content: expect.stringContaining('Objectif : découvrir') },
        ]),
      });
    });

    it('flow prompt does not include a discovery objective', async () => {
      let capturedBody: unknown = null;
      nock(BASE_URL)
        .post(CHAT_PATH, (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, createMockChatResponse('Super !'));

      await service.generateResponse(['Bonjour'], 'Et toi ?', { phase: 'flow', topic: null });

      expect(systemPromptFrom(capturedBody)).not.toContain('Objectif : découvrir');
    });

    it('flow prompt anchors the conversation on the discovered topic', async () => {
      let capturedBody: unknown = null;
      nock(BASE_URL)
        .post(CHAT_PATH, (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, createMockChatResponse('Super !'));

      await service.generateResponse([], 'On continue ?', { phase: 'flow', topic: 'rap français' });

      expect(systemPromptFrom(capturedBody)).toContain('rap français');
    });

    it('flow prompt has no topic anchor when no topic was discovered', async () => {
      let capturedBody: unknown = null;
      nock(BASE_URL)
        .post(CHAT_PATH, (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, createMockChatResponse('Super !'));

      await service.generateResponse([], 'On continue ?', { phase: 'flow', topic: null });

      expect(systemPromptFrom(capturedBody)).not.toContain("Sujet de l'étudiant");
    });

    it('builds message history with alternating tutor and student roles', async () => {
      let capturedBody: unknown = null;
      nock(BASE_URL)
        .post(CHAT_PATH, (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, createMockChatResponse('Réponse.'));

      await service.generateResponse(
        ['Premier message', 'Deuxième message'],
        'Troisième question',
        { phase: 'flow', topic: null },
      );

      expect(capturedBody).toMatchObject({
        model: 'llama2',
        messages: [
          { role: 'system', content: expect.stringContaining('ami français') },
          { role: 'assistant', content: 'Premier message' },
          { role: 'user', content: 'Deuxième message' },
          { role: 'user', content: 'Troisième question' },
        ],
        temperature: 0.7,
        max_tokens: 120,
      });
    });
  });

  describe('extractTopic', () => {
    it('returns the student\'s topic of interest from the conversation', async () => {
      nock(BASE_URL)
        .post(CHAT_PATH)
        .reply(200, createMockChatResponse('rap français'));

      const result = await service.extractTopic(['Salut !', 'J\'écoute du rap français']);

      expect(result).toBe('rap français');
    });

    it('falls back to "général" when the LLM returns nothing', async () => {
      nock(BASE_URL)
        .post(CHAT_PATH)
        .reply(200, createMockChatResponse(''));

      const result = await service.extractTopic(['Salut !', 'Je sais pas trop']);

      expect(result).toBe('général');
    });

    it('falls back to "général" when the LLM returns null content', async () => {
      nock(BASE_URL)
        .post(CHAT_PATH)
        .reply(200, createMockChatResponse(null));

      const result = await service.extractTopic(['Salut !', 'Je sais pas trop']);

      expect(result).toBe('général');
    });

    it('cleans up whitespace from the extracted topic', async () => {
      nock(BASE_URL)
        .post(CHAT_PATH)
        .reply(200, createMockChatResponse('  musique  '));

      const result = await service.extractTopic(['Salut !', 'J\'adore la musique']);

      expect(result).toBe('musique');
    });

    it('sends the conversation history to the LLM for analysis', async () => {
      let capturedBody: unknown = null;
      nock(BASE_URL)
        .post(CHAT_PATH, (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, createMockChatResponse('football'));

      await service.extractTopic(['Salut !', 'Je regarde le foot tous les soirs']);

      expect(capturedBody).toMatchObject({
        messages: [
          { role: 'system', content: expect.stringContaining('analyse des conversations') },
          { role: 'user', content: expect.stringContaining('Salut !') },
        ],
        max_tokens: 20,
      });
    });
  });
});
