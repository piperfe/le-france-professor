import nock from 'nock';

export const LLM_BASE_URL = 'http://localhost:9999';
const CHAT_COMPLETIONS_PATH = '/v1/chat/completions';

export function chatCompletionsMock(content: string) {
  return nock(LLM_BASE_URL).post(CHAT_COMPLETIONS_PATH).reply(200, {
    id: 'test-id',
    object: 'chat.completion',
    created: 1234567890,
    model: 'llama2',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  });
}

export function setIntegrationLlmEnv(): void {
  process.env.OLLAMA_MODEL = 'llama2';
  process.env.OLLAMA_BASE_URL = `${LLM_BASE_URL}/v1`;
}
