import type { Env } from '../../env';

export function testEnv(overrides?: Partial<Env>): Env {
  return {
    port: 3001,
    db: { url: ':memory:' },
    llm: { model: 'llama2', baseURL: 'http://localhost:9999/v1' },
    whisper: { url: 'http://127.0.0.1:7600' },
    whatsapp: null,
    ...overrides,
  };
}
