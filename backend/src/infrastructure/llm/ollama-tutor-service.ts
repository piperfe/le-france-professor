import OpenAI from 'openai';
import { Topic } from '../../domain/value-objects/topic';
import { TutorService } from '../../domain/services/tutor-service';
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
          content: 'Commencez la conversation en français sur ce sujet.',
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });
    return response.choices[0]?.message?.content || this.getDefaultGreeting();
  }

  @Span()
  async generateResponse(
    conversationHistory: string[],
    userMessage: string,
  ): Promise<string> {
    const systemPrompt = this.buildGeneralSystemPrompt();
    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.buildMessageHistory(conversationHistory),
      { role: 'user', content: userMessage },
    ];
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 300,
    });
    return response.choices[0]?.message?.content || this.getDefaultResponse();
  }

  selectTopic(): Topic {
    const randomIndex = Math.floor(Math.random() * this.topics.length);
    return this.topics[randomIndex];
  }

  private buildSystemPrompt(topic: Topic): string {
    return `Vous êtes un tuteur français amical et engageant. Votre rôle est d'enseigner le français de manière conversationnelle et intéressante.

Sujet de conversation: ${topic.title}
Description: ${topic.description}

Commencez la conversation en français de manière naturelle et engageante. Posez une question ouverte ou partagez une observation intéressante sur le sujet.`;
  }

  private buildGeneralSystemPrompt(): string {
    return `Vous êtes un tuteur français amical et engageant. Votre rôle est d'enseigner le français de manière conversationnelle.

Règles importantes:
- Répondez toujours en français
- Corrigez gentiment les erreurs de l'étudiant si nécessaire
- Encouragez l'étudiant à continuer
- Maintenez la conversation intéressante et éducative
- Utilisez un langage naturel et conversationnel`;
  }

  private buildMessageHistory(history: string[]): Array<{ role: string; content: string }> {
    return history.map((content, index) => ({
      role: index % 2 === 0 ? 'assistant' : 'user',
      content,
    }));
  }

  private getDefaultGreeting(): string {
    return "Bonjour ! Je suis ravi de vous aider à apprendre le français. Comment allez-vous aujourd'hui ?";
  }

  private getDefaultResponse(): string {
    return "C'est une excellente question ! Pouvez-vous me dire un peu plus sur ce qui vous intéresse ?";
  }
}
