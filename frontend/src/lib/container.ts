import { HttpConversationRepository } from '../infrastructure/api/http-conversation-repository'
import { CreateConversationUseCase } from '../application/use-cases/create-conversation-use-case'
import { SendMessageUseCase } from '../application/use-cases/send-message-use-case'
import { GetConversationUseCase } from '../application/use-cases/get-conversation-use-case'

const repository = new HttpConversationRepository(
  process.env.BACKEND_URL ?? 'http://localhost:3001/api',
)

export const createUseCase = new CreateConversationUseCase(repository)
export const sendUseCase = new SendMessageUseCase(repository)
export const getUseCase = new GetConversationUseCase(repository)
