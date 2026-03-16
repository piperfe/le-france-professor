export const dynamic = 'force-dynamic'

import { getAllConversationsUseCase } from '../lib/container'
import { StartButton } from '../components/start-button'
import { RecentConversationsList } from '../components/recent-conversations-list'

export default async function WelcomePage() {
  const result = await getAllConversationsUseCase.execute()
  const conversations = result.isOk()
    ? result.value.map((c) => ({ id: c.id, title: c.title, createdAt: c.createdAt.toISOString() }))
    : []

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen gap-8 p-8 text-center">
      <div
        className="fixed left-0 top-0 h-full w-1.5"
        style={{ background: 'linear-gradient(180deg, #002395 33.33%, #FFFFFF 33.33% 66.66%, #ED2939 66.66%)' }}
      />
      <div className="w-14 h-14 rounded-full bg-parchment border border-border flex items-center justify-center text-3xl">
        🇫🇷
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="font-display font-bold text-ink" style={{ fontSize: '2.5rem', lineHeight: 1.15 }}>
          Le <span style={{ color: '#002395' }}>France</span><br />Professor
        </h1>
        <p className="text-ink-muted max-w-sm mx-auto leading-relaxed">
          Apprenez le français naturellement, en conversation avec un tuteur IA.
        </p>
      </div>
      <StartButton />
      <RecentConversationsList conversations={conversations} />
    </main>
  )
}
