import { Topic } from '../value-objects/topic';

export interface TutorService {
  initiateConversation(): Promise<string>;
  generateResponse(
    conversationHistory: string[],
    userMessage: string,
  ): Promise<string>;
  selectTopic(): Topic;
}
