'use client'

import type { FormEvent } from 'react';
import { useState } from 'react'
import { Message, MessageSender } from '../domain/entities/message'
import { ChatMessage } from './chat-message'
import { VoiceInputButton } from './voice-input-button'
import type { VoiceState } from './use-voice-input'

const COMMANDS = [
  { command: '/vocabulary', description: 'Expliquer un mot en contexte' },
]

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
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  const loading = loadingLabel !== null
  const showAutocomplete = input.startsWith('/') && !input.slice(1).includes(' ')

  function handleVoiceStateChange(state: VoiceState, seconds: number) {
    setVoiceState(state)
    setRecordingSeconds(seconds)
  }

  const inputPlaceholder =
    voiceState === 'recording'    ? `Enregistrement… ${recordingSeconds}s` :
    voiceState === 'transcribing' ? 'Transcription en cours…' :
                                    'Tapez votre message en français…'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    if (input.startsWith('/')) {
      await handleSlashCommand(input.trim())
      return
    }

    const text = input
    const userMessage = new Message(crypto.randomUUID(), text, MessageSender.USER, new Date())
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoadingLabel('Le tuteur écrit...')
    setError(null)

    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    })

    setLoadingLabel(null)

    if (!res.ok) {
      setError("Erreur lors de l'envoi du message. Réessayez.")
      return
    }

    const { tutorResponse } = await res.json()
    const tutorMessage = new Message(crypto.randomUUID(), tutorResponse, MessageSender.TUTOR, new Date())
    setMessages((prev) => [...prev, tutorMessage])
  }

  async function handleSlashCommand(raw: string) {
    const [command, ...rest] = raw.slice(1).split(/\s+/)

    if (command.toLowerCase() === 'vocabulary') {
      const word = rest.join(' ')
      if (!word) {
        setError('Usage : /vocabulary [mot]')
        return
      }
      await handleVocabularyCommand(word)
      return
    }

    setError(`Commande inconnue : /${command}`)
  }

  async function handleVocabularyCommand(word: string) {
    const lastTutorMessage = [...messages].reverse().find((m) => m.sender === MessageSender.TUTOR)
    const context = lastTutorMessage?.content ?? ''

    setInput('')
    setLoadingLabel('Analyse en cours…')
    setError(null)

    const res = await fetch(`/api/conversations/${conversationId}/vocabulary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, context }),
    })

    setLoadingLabel(null)

    if (!res.ok) {
      setError('Erreur lors de la recherche du vocabulaire. Réessayez.')
      return
    }

    const { explanation } = await res.json()
    const vocabMessage = new Message(
      crypto.randomUUID(),
      explanation,
      MessageSender.TUTOR,
      new Date(),
      'vocabulary',
      word,
    )
    setMessages((prev) => [...prev, vocabMessage])
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
        {loadingLabel && <p className="text-sm text-gray-400 italic">{loadingLabel}</p>}
        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
      </div>

      <div className="relative px-6">
        {showAutocomplete && (
          <ul className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden z-10">
            {COMMANDS.filter((c) => c.command.startsWith(input)).map((c) => (
              <li key={c.command}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setInput(`${c.command} `)
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex gap-3 items-center"
                >
                  <span className="font-medium text-gray-900">{c.command}</span>
                  <span className="text-gray-400">{c.description}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={inputPlaceholder}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 disabled:bg-gray-50"
        />
        <VoiceInputButton
          onTranscription={(text) => setInput((prev) => prev ? `${prev} ${text}` : text)}
          onVoiceStateChange={handleVoiceStateChange}
          disabled={loading}
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
