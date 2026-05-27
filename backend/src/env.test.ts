import { parseEnv } from './env';

const ALL_KEYS = [
  'PORT', 'DATABASE_URL',
  'LLM_MODEL', 'LLM_BASE_URL', 'LLM_API_KEY',
  'WHISPER_URL',
  'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID',
];

const VALID_ENV = {
  PORT: '3001',
  DATABASE_URL: './le-france.db',
  LLM_MODEL: 'llama-3.3-70b-versatile',
  LLM_BASE_URL: 'http://localhost:11434/v1',
  WHISPER_URL: 'http://127.0.0.1:7600',
};

describe('parseEnv', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ALL_KEYS) saved[k] = process.env[k];
    for (const k of ALL_KEYS) delete process.env[k];
    for (const [k, v] of Object.entries(VALID_ENV)) process.env[k] = v;
  });

  afterEach(() => {
    for (const k of ALL_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  describe('port', () => {
    it('parses PORT as a number', () => {
      process.env.PORT = '4000';
      expect(parseEnv().port).toBe(4000);
    });

    it('throws "Expected number, received nan" when PORT is absent', () => {
      delete process.env.PORT;
      expect(() => parseEnv()).toThrow('Expected number, received nan');
    });
  });

  describe('db', () => {
    it('parses DATABASE_URL', () => {
      process.env.DATABASE_URL = './custom.db';
      expect(parseEnv().db.url).toBe('./custom.db');
    });

    it('throws "Required" when DATABASE_URL is absent', () => {
      delete process.env.DATABASE_URL;
      expect(() => parseEnv()).toThrow('Required');
    });

    it('throws "String must contain at least 1 character(s)" when DATABASE_URL is empty', () => {
      process.env.DATABASE_URL = '';
      expect(() => parseEnv()).toThrow('String must contain at least 1 character(s)');
    });
  });

  describe('llm', () => {
    it('parses model and baseURL', () => {
      process.env.LLM_MODEL = 'llama-3.3-70b-versatile';
      process.env.LLM_BASE_URL = 'http://localhost:11434/v1';
      expect(parseEnv().llm).toEqual({ model: 'llama-3.3-70b-versatile', baseURL: 'http://localhost:11434/v1', apiKey: undefined });
    });

    it('parses apiKey when LLM_API_KEY is set', () => {
      process.env.LLM_API_KEY = 'gsk_test123';
      expect(parseEnv().llm.apiKey).toBe('gsk_test123');
    });

    it('throws "Required" when LLM_MODEL is absent', () => {
      delete process.env.LLM_MODEL;
      expect(() => parseEnv()).toThrow('Required');
    });

    it('throws "set LLM_MODEL in backend/.env" when LLM_MODEL is empty', () => {
      process.env.LLM_MODEL = '';
      expect(() => parseEnv()).toThrow('set LLM_MODEL in backend/.env — e.g. llama-3.3-70b-versatile');
    });

    it('throws "Required" when LLM_BASE_URL is absent', () => {
      delete process.env.LLM_BASE_URL;
      expect(() => parseEnv()).toThrow('Required');
    });

    it('throws "Invalid url" when LLM_BASE_URL is not a valid URL', () => {
      process.env.LLM_BASE_URL = 'not-a-url';
      expect(() => parseEnv()).toThrow('Invalid url');
    });
  });

  describe('whisper', () => {
    it('parses WHISPER_URL', () => {
      process.env.WHISPER_URL = 'http://127.0.0.1:9000';
      expect(parseEnv().whisper.url).toBe('http://127.0.0.1:9000');
    });

    it('throws "Required" when WHISPER_URL is absent', () => {
      delete process.env.WHISPER_URL;
      expect(() => parseEnv()).toThrow('Required');
    });

    it('throws "Invalid url" when WHISPER_URL is not a valid URL', () => {
      process.env.WHISPER_URL = 'not-a-url';
      expect(() => parseEnv()).toThrow('Invalid url');
    });
  });

  describe('whatsapp', () => {
    it('parses all three WhatsApp vars', () => {
      process.env.WHATSAPP_VERIFY_TOKEN = 'tok';
      process.env.WHATSAPP_ACCESS_TOKEN = 'acc';
      process.env.WHATSAPP_PHONE_NUMBER_ID = 'pid';
      expect(parseEnv().whatsapp).toEqual({
        verifyToken: 'tok',
        accessToken: 'acc',
        phoneNumberId: 'pid',
      });
    });

    it('is null when WHATSAPP_VERIFY_TOKEN is absent', () => {
      expect(parseEnv().whatsapp).toBeNull();
    });

    it('throws "Required" when only partial WhatsApp vars are set', () => {
      process.env.WHATSAPP_VERIFY_TOKEN = 'tok';
      // WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID absent
      expect(() => parseEnv()).toThrow('Required');
    });

    it('throws "String must contain at least 1 character(s)" when WHATSAPP_ACCESS_TOKEN is empty', () => {
      process.env.WHATSAPP_VERIFY_TOKEN = 'tok';
      process.env.WHATSAPP_ACCESS_TOKEN = '';
      process.env.WHATSAPP_PHONE_NUMBER_ID = 'pid';
      expect(() => parseEnv()).toThrow('String must contain at least 1 character(s)');
    });

    it('throws "String must contain at least 1 character(s)" when WHATSAPP_PHONE_NUMBER_ID is empty', () => {
      process.env.WHATSAPP_VERIFY_TOKEN = 'tok';
      process.env.WHATSAPP_ACCESS_TOKEN = 'acc';
      process.env.WHATSAPP_PHONE_NUMBER_ID = '';
      expect(() => parseEnv()).toThrow('String must contain at least 1 character(s)');
    });
  });
});
