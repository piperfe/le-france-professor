import OpenAI from 'openai';
import type { VocabularyService } from '../../domain/services/vocabulary-service';
import type { OllamaConfig } from './ollama-tutor-service';
import { Span } from '../telemetry/decorators';

export class OllamaVocabularyService implements VocabularyService {
  private client: OpenAI;
  private model: string;

  constructor(config: OllamaConfig) {
    this.client = new OpenAI({
      baseURL: config.baseURL,
      apiKey: 'ollama',
    });
    this.model = config.model;
  }

  @Span()
  async explainVocabulary(word: string, context: string): Promise<string> {
    const systemPrompt = `Tu es un assistant linguistique pour l'apprentissage du français. Tu expliques les mots en contexte, mentionnes leur forme grammaticale, et donnes leur traduction en anglais. Réponds en 2 à 3 phrases, en français. Ne pose pas de question.`;
    const userMessage = context
      ? `Dans la phrase « ${context} », explique le mot « ${word} » : sa signification dans ce contexte, sa forme grammaticale, et sa traduction en anglais.`
      : `Explique le mot « ${word} » en français : sa signification, sa forme grammaticale, et sa traduction en anglais.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 150,
      // @ts-expect-error — Ollama-specific sampling options not in OpenAI types
      repeat_penalty: 1.15,
      presence_penalty: 0.3,
    });
    return response.choices[0]?.message?.content ?? "Je ne peux pas expliquer ce mot pour le moment.";
  }
}
