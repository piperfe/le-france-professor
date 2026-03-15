import nock from 'nock';
import { OllamaTitleService } from './ollama-title-service';
import { Message, MessageSender } from '../../domain/entities/message';

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
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };
}

function makeMessages(count: number): Message[] {
  return Array.from({ length: count }, (_, i) =>
    Message.create(`Message ${i + 1}`, i % 2 === 0 ? MessageSender.TUTOR : MessageSender.USER),
  );
}

describe('OllamaTitleService', () => {
  let service: OllamaTitleService;

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    service = new OllamaTitleService({ baseURL: `${BASE_URL}/v1`, model: 'llama2' });
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('generateTitle', () => {
    it('returns the LLM-generated title', async () => {
      nock(BASE_URL).post(CHAT_PATH).reply(200, createMockChatResponse('La cuisine française avec Sophie'));

      const result = await service.generateTitle(makeMessages(4));

      expect(result).toBe('La cuisine française avec Sophie');
    });

    it('returns "Nouvelle conversation" fallback when API returns empty choices', async () => {
      nock(BASE_URL).post(CHAT_PATH).reply(200, createMockChatResponse(null));

      const result = await service.generateTitle(makeMessages(2));

      expect(result).toBe('Nouvelle conversation');
    });

    it('strips trailing punctuation from the raw LLM response', async () => {
      nock(BASE_URL).post(CHAT_PATH).reply(200, createMockChatResponse('Visite du marché dominical.'));

      const result = await service.generateTitle(makeMessages(2));

      expect(result).toBe('Visite du marché dominical');
    });

    it('sends only the first 4 messages regardless of conversation length', async () => {
      let capturedBody: unknown = null;
      nock(BASE_URL)
        .post(CHAT_PATH, (body) => { capturedBody = body; return true; })
        .reply(200, createMockChatResponse('Titre'));

      await service.generateTitle(makeMessages(8));

      const userMsg = (capturedBody as any).messages.find((m: any) => m.role === 'user');
      const lines = userMsg.content.split('\n');
      expect(lines).toHaveLength(4);
    });

    it('sends a system prompt that instructs a 4–7 word French title without roles', async () => {
      let capturedBody: unknown = null;
      nock(BASE_URL)
        .post(CHAT_PATH, (body) => { capturedBody = body; return true; })
        .reply(200, createMockChatResponse('Titre'));

      await service.generateTitle(makeMessages(2));

      expect(capturedBody).toMatchObject({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('sans rôles'),
          }),
        ]),
      });
    });

    it('uses temperature 0.5 for balanced creativity', async () => {
      let capturedBody: unknown = null;
      nock(BASE_URL)
        .post(CHAT_PATH, (body) => { capturedBody = body; return true; })
        .reply(200, createMockChatResponse('Titre'));

      await service.generateTitle(makeMessages(2));

      expect(capturedBody).toMatchObject({ temperature: 0.5 });
    });
  });
});
