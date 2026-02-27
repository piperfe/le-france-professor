import { ChatInterface } from './adapters/components/chat-interface';
import { CreateConversationUseCase } from './application/use-cases/create-conversation-use-case';
import { SendMessageUseCase } from './application/use-cases/send-message-use-case';
import { GetConversationUseCase } from './application/use-cases/get-conversation-use-case';
import { HttpConversationRepository } from './infrastructure/api/http-conversation-repository';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const repository = new HttpConversationRepository(API_BASE_URL);
const createUseCase = new CreateConversationUseCase(repository);
const sendUseCase = new SendMessageUseCase(repository);
const getUseCase = new GetConversationUseCase(repository);

export function App() {
  return (
    <ChatInterface
      createUseCase={createUseCase}
      sendUseCase={sendUseCase}
      getUseCase={getUseCase}
    />
  );
}
