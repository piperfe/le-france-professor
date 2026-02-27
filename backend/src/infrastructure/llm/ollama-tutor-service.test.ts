import nock from 'nock';
import { OllamaTutorService } from './ollama-tutor-service';

const BASE_URL = 'http://localhost:9999';
const API_BASE = `${BASE_URL}/v1`;
const CHAT_PATH = '/v1/chat/completions';

function createMockChatResponse(content: string) {
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
    it('returns the LLM greeting when the API returns content', async () => {
      const greeting = 'Bonjour ! Parlons de la culture française aujourd\'hui.';
      nock(BASE_URL)
        .post(CHAT_PATH)
        .reply(200, createMockChatResponse(greeting));

      const result = await service.initiateConversation();

      expect(result).toBe(greeting);
    });

    it('returns default greeting when API returns empty choices', async () => {
      nock(BASE_URL)
        .post(CHAT_PATH)
        .reply(200, {
          ...createMockChatResponse(''),
          choices: [],
        });

      const result = await service.initiateConversation();

      expect(result).toBe(
        "Bonjour ! Je suis ravi de vous aider à apprendre le français. Comment allez-vous aujourd'hui ?",
      );
    });

    it('returns default greeting when API returns null content', async () => {
      nock(BASE_URL)
        .post(CHAT_PATH)
        .reply(200, {
          id: 'test',
          choices: [{ index: 0, message: { role: 'assistant', content: null }, finish_reason: 'stop' }],
        });

      const result = await service.initiateConversation();

      expect(result).toBe(
        "Bonjour ! Je suis ravi de vous aider à apprendre le français. Comment allez-vous aujourd'hui ?",
      );
    });

    it('calls the API with system and user messages for conversation start', async () => {
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
          { role: 'system', content: expect.stringContaining('tuteur français') },
          { role: 'user', content: 'Commencez la conversation en français sur ce sujet.' },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });
    });
  });

  describe('generateResponse', () => {
    it('returns the LLM response when the API returns content', async () => {
      const reply = 'Oui, le français est parlé sur plusieurs continents !';
      nock(BASE_URL)
        .post(CHAT_PATH)
        .reply(200, createMockChatResponse(reply));

      const result = await service.generateResponse(
        ['Bonjour', 'Parlez-vous français ?'],
        'Où parle-t-on français ?',
      );

      expect(result).toBe(reply);
    });

    it('returns default response when API returns empty content', async () => {
      nock(BASE_URL)
        .post(CHAT_PATH)
        .reply(200, createMockChatResponse(''));

      const result = await service.generateResponse([], 'Question?');

      expect(result).toBe(
        "C'est une excellente question ! Pouvez-vous me dire un peu plus sur ce qui vous intéresse ?",
      );
    });

    it('calls the API with conversation history and user message', async () => {
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
      );

      expect(capturedBody).toMatchObject({
        model: 'llama2',
        messages: [
          { role: 'system', content: expect.stringContaining('Répondez toujours en français') },
          { role: 'assistant', content: 'Premier message' },
          { role: 'user', content: 'Deuxième message' },
          { role: 'user', content: 'Troisième question' },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });
    });
  });

  describe('selectTopic', () => {
    it('returns a topic with title and description', () => {
      const topic = service.selectTopic();

      expect(topic).toHaveProperty('title');
      expect(topic).toHaveProperty('description');
      expect(typeof topic.title).toBe('string');
      expect(typeof topic.description).toBe('string');
      expect(topic.title.length).toBeGreaterThan(0);
      expect(topic.description.length).toBeGreaterThan(0);
    });

    it('returns one of the predefined topics', () => {
      const validTitles = [
        "L'adoption de l'IA en France",
        'La culture française',
        'Le français dans le monde',
      ];
      const topic = service.selectTopic();
      expect(validTitles).toContain(topic.title);
    });
  });
});
