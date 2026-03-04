'use client'

import type { FormEvent } from 'react';
import { useState } from 'react'
import { Message, MessageSender } from '../domain/entities/message'
import { ChatMessage } from './chat-message'

interface MessageDTO {
  id: string
  content: string
  sender: string
  timestamp: string
}

interface Props {
  initialMessages: MessageDTO[]
  conversationId: string
}

export function ChatClient({ initialMessages, conversationId }: Props) {
  const [messages, setMessages] = useState<Message[]>(() =>
    initialMessages.map(
      (dto) => new Message(dto.id, dto.content, dto.sender as MessageSender, new Date(dto.timestamp)),
    ),
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = new Message(`msg-${Date.now()}`, input, MessageSender.USER, new Date())
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input }),
    })

    setLoading(false)

    if (!res.ok) {
      setError("Erreur lors de l'envoi du message. Réessayez.")
      return
    }

    const { tutorResponse } = await res.json()
    const tutorMessage = new Message(`msg-${Date.now() + 1}`, tutorResponse, MessageSender.TUTOR, new Date())
    setMessages((prev) => [...prev, tutorMessage])
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto w-full">
      <header className="px-6 py-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900">Conversation en français</h2>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {loading && <p className="text-sm text-gray-400 italic">Le tuteur écrit...</p>}
        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tapez votre message en français..."
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          Envoyer
        </button>
      </form>
    </div>
  )
}
