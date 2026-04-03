import type { ConversationPhase } from '../entities/conversation';

export interface TutorResponseContext {
  phase: ConversationPhase;
  topic: string | null;
}

export interface TutorService {
  initiateConversation(): Promise<string>;
  generateResponse(
    conversationHistory: string[],
    userMessage: string,
    context: TutorResponseContext,
  ): Promise<string>;
  extractTopic(history: string[]): Promise<string>;
}
