'use client'

import { useRouter } from 'next/navigation'

interface ConversationItem {
  id: string
  title: string
  createdAt: string
}

interface Props {
  conversations: ConversationItem[]
}

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000)

  const hh = date.getHours().toString().padStart(2, '0')
  const mm = date.getMinutes().toString().padStart(2, '0')

  if (date >= todayStart) return `Aujourd'hui à ${hh}h${mm}`
  if (date >= yesterdayStart) return `Hier à ${hh}h${mm}`

  const diffDays = Math.floor((todayStart.getTime() - date.getTime()) / 86_400_000)
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

export function RecentConversationsList({ conversations }: Props) {
  const router = useRouter()

  if (conversations.length === 0) return null

  return (
    <div className="flex flex-col gap-2 w-80 max-w-full">
      <div className="flex items-center gap-3">
        <span className="flex-1 h-px bg-border" />
        <span className="text-xs text-ink-muted">conversations récentes</span>
        <span className="flex-1 h-px bg-border" />
      </div>

      {conversations.map((conv) => (
        <button
          key={conv.id}
          type="button"
          onClick={() => router.push(`/conversation/${conv.id}`)}
          className="flex items-center gap-3 px-[15px] py-px bg-white border border-border rounded-[10px] text-left w-full transition-colors hover:bg-parchment cursor-pointer min-h-[50px]"
        >
          <span className="text-base flex-shrink-0">💬</span>
          <span className="flex-1 min-w-0">
            <span className="block font-medium text-ink text-[13px] truncate">{conv.title}</span>
            <span className="block text-[11px] text-ink-muted">{formatRelativeDate(conv.createdAt)}</span>
          </span>
          <span className="text-ink-muted text-sm flex-shrink-0">›</span>
        </button>
      ))}
    </div>
  )
}
