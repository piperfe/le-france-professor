'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ConversationSummaryDTO {
  id: string
  title: string
}

interface Props {
  activeConversationId: string
  conversations: ConversationSummaryDTO[]
}

export function Sidebar({ activeConversationId, conversations }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleNewConversation() {
    setLoading(true)
    const res = await fetch('/api/conversations', { method: 'POST' })
    if (!res.ok) {
      setLoading(false)
      return
    }
    const { conversationId } = await res.json()
    router.push(`/conversation/${conversationId}`)
  }

  return (
    <div className="hidden md:flex flex-col w-60 flex-shrink-0 bg-ink">
      <div className="px-4 py-5 border-b border-white/10">
        <div className="text-xl mb-1.5">🇫🇷</div>
        <div className="font-display font-bold text-white text-sm leading-tight">
          Le France<br />Professor
        </div>
        <div className="text-[10px] uppercase tracking-widest text-white/30 mt-1">Tuteur IA</div>
      </div>

      <div className="px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
        Conversations
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => {
          const isActive = conv.id === activeConversationId
          return (
            <button
              key={conv.id}
              onClick={() => router.push(`/conversation/${conv.id}`)}
              className={`w-full text-left flex items-center gap-2.5 px-4 py-2.5 transition-colors ${
                isActive
                  ? 'bg-white/[0.08] cursor-default'
                  : 'hover:bg-white/[0.05] cursor-pointer'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-rouge' : 'bg-transparent'}`} />
              <span className="text-xs text-white truncate">{conv.title}</span>
            </button>
          )
        })}
      </div>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleNewConversation}
          disabled={loading}
          className="w-full py-2.5 bg-tricolore hover:bg-tricolore-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? '…' : '+ Nouvelle conversation'}
        </button>
      </div>
    </div>
  )
}
