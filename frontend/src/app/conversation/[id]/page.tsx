import { redirect } from 'next/navigation'
import { getConversationUseCase, getAllConversationsUseCase } from '../../../lib/container'
import { ChatClient } from '../../../components/chat-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params
  const [convResult, allResult] = await Promise.all([
    getConversationUseCase.execute(id),
    getAllConversationsUseCase.execute(),
  ])

  if (convResult.isErr() && convResult.error.code === 'NOT_FOUND') redirect('/')
  if (convResult.isErr()) throw convResult.error

  const conversation = convResult.value
  const initialMessages = conversation.messages.map((m) => ({
    id: m.id,
    content: m.content,
    sender: m.sender,
    timestamp: m.timestamp.toISOString(),
  }))

  const conversations = allResult.isOk()
    ? allResult.value.map((c) => ({ id: c.id, title: c.title }))
    : []

  return <ChatClient initialMessages={initialMessages} conversationId={id} conversations={conversations} />
}
