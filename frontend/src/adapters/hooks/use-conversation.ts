import { useState, useCallback } from 'react';
import { Conversation } from '../../domain/entities/conversation';
import { Message, MessageSender } from '../../domain/entities/message';
import { CreateConversationUseCase } from '../../application/use-cases/create-conversation-use-case';
import { SendMessageUseCase } from '../../application/use-cases/send-message-use-case';
import { GetConversationUseCase } from '../../application/use-cases/get-conversation-use-case';

export function useConversation(
  createUseCase: CreateConversationUseCase,
  sendUseCase: SendMessageUseCase,
  getUseCase: GetConversationUseCase,
) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startConversation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await createUseCase.execute();
      const initialMessage = new Message(
        `msg-${Date.now()}`,
        result.initialMessage,
        MessageSender.TUTOR,
        new Date(),
      );
      const newConversation = new Conversation(
        result.conversationId,
        [initialMessage],
        new Date(),
      );
      setConversation(newConversation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [createUseCase]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversation) {
        throw new Error('No active conversation');
      }
      setLoading(true);
      setError(null);
      try {
        const userMessage = new Message(
          `msg-${Date.now()}`,
          content,
          MessageSender.USER,
          new Date(),
        );
        const updatedConversation = conversation.addMessage(userMessage);
        setConversation(updatedConversation);
        const result = await sendUseCase.execute(conversation.id, content);
        const tutorMessage = new Message(
          `msg-${Date.now() + 1}`,
          result.tutorResponse,
          MessageSender.TUTOR,
          new Date(),
        );
        setConversation(updatedConversation.addMessage(tutorMessage));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [conversation, sendUseCase],
  );

  return {
    conversation,
    loading,
    error,
    startConversation,
    sendMessage,
  };
}
