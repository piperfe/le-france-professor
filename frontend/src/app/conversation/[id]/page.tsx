import { redirect } from 'next/navigation'
import { getUseCase } from '../../../lib/container'
import { ChatClient } from '../../../components/chat-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params
  const result = await getUseCase.execute(id)

  if (result.isErr() && result.error.code === 'NOT_FOUND') redirect('/')
  if (result.isErr()) throw result.error

  const conversation = result.value
  const initialMessages = conversation.messages.map((m) => ({
    id: m.id,
    content: m.content,
    sender: m.sender,
    timestamp: m.timestamp.toISOString(),
  }))

  return <ChatClient initialMessages={initialMessages} conversationId={id} />
}
