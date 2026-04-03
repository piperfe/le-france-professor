import OpenAI from 'openai';
import type { TutorService, TutorResponseContext } from '../../domain/services/tutor-service';
import { Span } from '../telemetry/decorators';

export interface OllamaConfig {
  baseURL: string;
  model: string;
}

const ANTI_REPETITION = { repeat_penalty: 1.15, presence_penalty: 0.3 } as const;

export class OllamaTutorService implements TutorService {
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
  async initiateConversation(): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: this.buildInitiationSystemPrompt() },
        {
          role: 'user',
          content: "Salue l'étudiant comme un ami et demande-lui de quoi il aime parler. Une ou deux phrases, décontractées.",
        },
      ],
      temperature: 0.7,
      max_tokens: 50,
      ...ANTI_REPETITION,
    });
    return response.choices[0]?.message?.content || this.getDefaultGreeting();
  }

  @Span()
  async generateResponse(
    conversationHistory: string[],
    userMessage: string,
    context: TutorResponseContext,
  ): Promise<string> {
    const systemPrompt = context.phase === 'calibration'
      ? this.buildCalibrationSystemPrompt()
      : this.buildFlowSystemPrompt(context.topic);

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
      ...ANTI_REPETITION,
    });
    return response.choices[0]?.message?.content || this.getDefaultResponse();
  }

  @Span()
  async extractTopic(history: string[]): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: "Tu es un assistant qui analyse des conversations." },
        {
          role: 'user',
          content: `Voici une conversation entre un tuteur et un étudiant qui apprend le français :\n\n${history.join('\n')}\n\nQuel sujet intéresse l'étudiant ? Réponds en un mot ou une courte expression (par exemple : "musique", "football", "cuisine italienne"). Si le sujet n'est pas clair, réponds : "général".`,
        },
      ],
      temperature: 0.3,
      max_tokens: 20,
    });
    return response.choices[0]?.message?.content?.trim() || 'général';
  }

  private buildInitiationSystemPrompt(): string {
    return `Tu es un ami français qui aide quelqu'un à apprendre le français en discutant.

Règles :
- Utilise "tu", jamais "vous"
- Une ou deux phrases courtes — un bonjour naturel suivi d'une question sur ce que la personne aime
- Pas d'introduction, pas de discours`;
  }

  private buildCalibrationSystemPrompt(): string {
    return `Tu es un ami français qui aide quelqu'un à apprendre le français en discutant.

Objectif : découvrir ce qui intéresse vraiment l'étudiant pour ancrer toute la conversation sur ce sujet.

Conversation :
- Utilise "tu", jamais "vous"
- 1 à 2 phrases en général, jusqu'à 3 si tu expliques quelque chose
- Une question par réponse si c'est naturel — pas une obligation systématique
- Varie tes réactions, pas plus d'un point d'exclamation par réponse
- Pas d'emojis, pas de commentaires évidents
- Ne pose pas de questions sur la vie privée (nom, famille, couple, etc.)
- Si l'étudiant mentionne un intérêt (musique, sport, films, cuisine...), creuse ce sujet

Enseignement — c'est ta priorité :
- Si l'étudiant fait une erreur en français, réutilise la forme correcte naturellement dans ta réponse sans le signaler. Exemple : l'étudiant dit "j'ai mangé du poulet avec semoule" → tu réponds "Ah du poulet avec de la semoule, c'est délicieux !"
- Glisse un mot ou une expression française utile quand le contexte s'y prête. Présente-le simplement, sans en faire un cours. Exemple : l'étudiant parle de manger → "D'ailleurs, on dit souvent 'avoir un petit creux' quand on a un peu faim, tu connaissais ?"
- Si l'étudiant utilise une expression intéressante ou inhabituelle, relève-la et explique-la brièvement`;
  }

  private buildFlowSystemPrompt(topic: string | null): string {
    const topicAnchor = topic
      ? `\nSujet de l'étudiant : ${topic} — reste ancré sur ce sujet, si la conversation dérive ramène-la naturellement.\n`
      : '';

    return `Tu es un ami français qui aide quelqu'un à apprendre le français en discutant.${topicAnchor}
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
    return "Salut ! Dis-moi, t'es plutôt sport, musique, films… ou autre chose ?";
  }

  private getDefaultResponse(): string {
    return "Ah ouais ? Raconte !";
  }
}
