import { redirect } from 'next/navigation'
import { getConversationUseCase, getAllConversationsUseCase, getVocabularyUseCase } from '../../../lib/container'
import { ChatClient } from '../../../components/chat-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params
  const [convResult, allResult, vocabResult] = await Promise.all([
    getConversationUseCase.execute(id),
    getAllConversationsUseCase.execute(),
    getVocabularyUseCase.execute(id),
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

  const initialVocabulary = vocabResult.isOk()
    ? vocabResult.value.map((e) => ({
        id: e.id,
        word: e.word,
        explanation: e.explanation,
        sourceMessageId: e.sourceMessageId,
        conversationId: e.conversationId,
        createdAt: e.createdAt.toISOString(),
      }))
    : []

  return (
    <ChatClient
      initialMessages={initialMessages}
      conversationId={id}
      conversations={conversations}
      initialVocabulary={initialVocabulary}
    />
  )
}
