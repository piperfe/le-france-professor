'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function StartButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/conversations', { method: 'POST' })
    if (!res.ok) {
      setError('Impossible de démarrer une conversation. Réessayez.')
      setLoading(false)
      return
    }
    const { conversationId } = await res.json()
    router.push(`/conversation/${conversationId}`)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="bg-tricolore hover:bg-tricolore-700 disabled:bg-border text-white font-display font-semibold px-10 py-3.5 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(0,35,149,0.25)]"
      >
        {loading ? 'Démarrage…' : 'Commencer →'}
      </button>
      {error && <p className="text-rouge text-sm">{error}</p>}
    </div>
  )
}
