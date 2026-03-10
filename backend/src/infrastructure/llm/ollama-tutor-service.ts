import OpenAI from 'openai';
import { Topic } from '../../domain/value-objects/topic';
import type { TutorService } from '../../domain/services/tutor-service';
import { Span } from '../telemetry/decorators';

export interface OllamaConfig {
  baseURL: string;
  model: string;
}

export class OllamaTutorService implements TutorService {
  private client: OpenAI;
  private model: string;
  private topics: Topic[];

  constructor(config: OllamaConfig) {
    this.client = new OpenAI({
      baseURL: config.baseURL,
      apiKey: 'ollama',
    });
    this.model = config.model;
    this.topics = [
      Topic.createAIAdoptionInFrance(),
      Topic.createFrenchCulture(),
      Topic.createFrenchLanguageWorldwide(),
    ];
  }

  @Span()
  async initiateConversation(): Promise<string> {
    const topic = this.selectTopic();
    const systemPrompt = this.buildSystemPrompt(topic);
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: "Salue l'étudiant comme un ami. Une seule phrase, décontractée.",
        },
      ],
      temperature: 0.7,
      max_tokens: 50,
      // @ts-expect-error — Ollama-specific sampling options not in OpenAI types
      repeat_penalty: 1.15,
      presence_penalty: 0.3,
    });
    return response.choices[0]?.message?.content || this.getDefaultGreeting();
  }

  @Span()
  async generateResponse(
    conversationHistory: string[],
    userMessage: string,
  ): Promise<string> {
    const systemPrompt = this.buildGeneralSystemPrompt();
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...this.buildMessageHistory(conversationHistory),
      { role: 'user', content: userMessage },
    ];
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 120,
      // @ts-expect-error — Ollama-specific sampling options not in OpenAI types
      repeat_penalty: 1.15,
      presence_penalty: 0.3,
    });
    return response.choices[0]?.message?.content || this.getDefaultResponse();
  }

  selectTopic(): Topic {
    const randomIndex = Math.floor(Math.random() * this.topics.length);
    return this.topics[randomIndex];
  }

  private buildSystemPrompt(_topic: Topic): string {
    return `Tu es un ami français qui aide quelqu'un à apprendre le français en discutant.

Règles :
- Utilise "tu", jamais "vous"
- Une seule phrase courte — un simple bonjour naturel
- Pas d'introduction, pas de sujet, pas de discours`;
  }

  private buildGeneralSystemPrompt(): string {
    return `Tu es un ami français qui aide quelqu'un à apprendre le français en discutant.

Conversation :
- Utilise "tu", jamais "vous"
- 1 à 2 phrases en général, jusqu'à 3 si tu expliques quelque chose
- Une seule question par réponse — jamais deux
- Varie tes réactions, pas plus d'un point d'exclamation par réponse
- Pas d'emojis, pas de commentaires évidents ("c'est important de bien manger"...)
- Ne pose pas de questions sur la vie privée (nom, famille, couple, etc.)

Enseignement — c'est ta priorité :
- Si l'étudiant fait une erreur en français, réutilise la forme correcte naturellement dans ta réponse sans le signaler. Exemple : l'étudiant dit "j'ai mangé du poulet avec semoule" → tu réponds "Ah du poulet avec de la semoule, c'est délicieux !"
- Glisse un mot ou une expression française utile quand le contexte s'y prête. Présente-le simplement, sans en faire un cours. Exemple : l'étudiant parle de manger → "D'ailleurs, on dit souvent 'avoir un petit creux' quand on a un peu faim, tu connaissais ?"
- Si l'étudiant utilise une expression intéressante ou inhabituelle, relève-la et explique-la brièvement`;
  }

  private buildMessageHistory(history: string[]): Array<{ role: 'user' | 'assistant'; content: string }> {
    return history.map((content, index) => ({
      role: index % 2 === 0 ? 'assistant' : 'user',
      content,
    }));
  }

  private getDefaultGreeting(): string {
    return "Bah salut ! Ça va ?";
  }

  private getDefaultResponse(): string {
    return "Ah ouais ? Raconte !";
  }
}
