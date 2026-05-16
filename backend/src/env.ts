import { z } from 'zod';

const WhatsAppEnvSchema = z.object({
  verifyToken: z.string().nonempty(),
  accessToken: z.string().nonempty(),
  phoneNumberId: z.string().nonempty(),
});

const EnvSchema = z.object({
  port: z.coerce.number(),
  db: z.object({
    url: z.string().nonempty(),
  }),
  ollama: z.object({
    model: z.string().nonempty('set OLLAMA_MODEL in backend/.env — e.g. gemma3:4b'),
    baseURL: z.string().url(),
  }),
  whisper: z.object({
    url: z.string().url(),
  }),
  whatsapp: WhatsAppEnvSchema.nullable(),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(): Env {
  return EnvSchema.parse({
    port: process.env.PORT,
    db: { url: process.env.DATABASE_URL },
    ollama: {
      model: process.env.OLLAMA_MODEL,
      baseURL: process.env.OLLAMA_BASE_URL,
    },
    whisper: { url: process.env.WHISPER_URL },
    whatsapp: process.env.WHATSAPP_VERIFY_TOKEN
      ? {
          verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
          accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
          phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        }
      : null,
  });
}
