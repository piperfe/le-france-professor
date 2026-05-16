import { parseEnv } from './env';

const ALL_KEYS = [
  'PORT', 'DATABASE_URL',
  'OLLAMA_MODEL', 'OLLAMA_BASE_URL',
  'WHISPER_URL',
  'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID',
];

const VALID_ENV = {
  PORT: '3001',
  DATABASE_URL: './le-france.db',
  OLLAMA_MODEL: 'gemma3:4b',
  OLLAMA_BASE_URL: 'http://localhost:11434/v1',
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

  describe('ollama', () => {
    it('parses model and baseURL', () => {
      process.env.OLLAMA_MODEL = 'mistral-nemo';
      process.env.OLLAMA_BASE_URL = 'http://localhost:11434/v1';
      expect(parseEnv().ollama).toEqual({ model: 'mistral-nemo', baseURL: 'http://localhost:11434/v1' });
    });

    it('throws "Required" when OLLAMA_MODEL is absent', () => {
      delete process.env.OLLAMA_MODEL;
      expect(() => parseEnv()).toThrow('Required');
    });

    it('throws "set OLLAMA_MODEL in backend/.env" when OLLAMA_MODEL is empty', () => {
      process.env.OLLAMA_MODEL = '';
      expect(() => parseEnv()).toThrow('set OLLAMA_MODEL in backend/.env — e.g. gemma3:4b');
    });

    it('throws "Required" when OLLAMA_BASE_URL is absent', () => {
      delete process.env.OLLAMA_BASE_URL;
      expect(() => parseEnv()).toThrow('Required');
    });

    it('throws "Invalid url" when OLLAMA_BASE_URL is not a valid URL', () => {
      process.env.OLLAMA_BASE_URL = 'not-a-url';
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
