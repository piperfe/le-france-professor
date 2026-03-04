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
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-8 py-3 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? 'Démarrage...' : 'Commencer'}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  )
}
