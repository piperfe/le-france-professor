import OpenAI from 'openai';
import type { TitleService } from '../../domain/services/title-service';
import type { Message } from '../../domain/entities/message';
import type { LlmConfig } from './llm-tutor-service';
import { Span } from '../telemetry/decorators';

const TITLE_CONTEXT_MESSAGES = 4;

export class LlmTitleService implements TitleService {
  private client: OpenAI;
  private model: string;

  constructor(config: LlmConfig) {
    this.client = new OpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey ?? 'ollama',
    });
    this.model = config.model;
  }

  @Span()
  async generateTitle(messages: Message[]): Promise<string> {
    const excerpt = messages
      .slice(0, TITLE_CONTEXT_MESSAGES)
      .map((m) => m.content.trim())
      .join('\n');

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            "Génère un titre de 4 à 7 mots en français qui résume le sujet de cette conversation. Réponds uniquement avec le titre, sans rôles, sans ponctuation finale, sans guillemets. Exemple : \"Les spécialités culinaires du sud\".",
        },
        { role: 'user', content: excerpt },
      ],
      temperature: 0.5,
      max_tokens: 20,
    });

    const raw = response.choices[0]?.message?.content ?? '';
    return raw.trim().replace(/[.!?»":]+$/, '') || 'Nouvelle conversation';
  }
}
