'use client'

import type { FormEvent } from 'react';
import { useState } from 'react'
import { Message, MessageSender } from '../domain/entities/message'
import { ChatMessage } from './chat-message'
import { Sidebar } from './sidebar'
import { VoiceInputButton } from './voice-input-button'
import { VocabularyDrawer } from './vocabulary-drawer'
import type { VocabularyEntryDTO } from './vocabulary-drawer'
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

interface ConversationSummaryDTO {
  id: string
  title: string
}

interface Props {
  initialMessages: MessageDTO[]
  conversationId: string
  conversations: ConversationSummaryDTO[]
  initialVocabulary: VocabularyEntryDTO[]
}

export function ChatClient({ initialMessages, conversationId, conversations, initialVocabulary }: Props) {
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
  const [vocabularyWords, setVocabularyWords] = useState<VocabularyEntryDTO[]>(initialVocabulary)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null)

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

    const { tutorResponse, messageId } = await res.json()
    const tutorMessage = new Message(messageId, tutorResponse, MessageSender.TUTOR, new Date())
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
    const sourceMessageId = lastTutorMessage?.id ?? ''

    setInput('')
    setLoadingLabel('Analyse en cours…')
    setError(null)

    const res = await fetch(`/api/conversations/${conversationId}/vocabulary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, context, sourceMessageId }),
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

    const vocabRes = await fetch(`/api/conversations/${conversationId}/vocabulary`)
    if (vocabRes.ok) {
      const data: { vocabulary: VocabularyEntryDTO[] } = await vocabRes.json()
      setVocabularyWords(data.vocabulary)
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar activeConversationId={conversationId} conversations={conversations} />
      <div className="flex flex-col flex-1 min-w-0">
      <header className="px-5 py-3 border-b border-border bg-white flex items-center gap-3 flex-shrink-0 shadow-sm">
        <div className="w-9 h-9 rounded-full bg-tricolore-50 border-2 border-tricolore flex items-center justify-center text-lg flex-shrink-0">
          👩‍🏫
        </div>
        <div className="flex-1">
          <h2 className="font-display font-semibold text-ink leading-none">Professeure Sophie</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 align-middle" />
            Conversation en français
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={`Ouvrir le carnet de vocabulaire, ${vocabularyWords.length} mot${vocabularyWords.length !== 1 ? 's' : ''}`}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
            drawerOpen
              ? 'bg-vocab border-vocab text-white'
              : 'bg-vocab-50 border-vocab/30 text-vocab hover:bg-vocab/10'
          }`}
        >
          📖 Vocabulaire
          {vocabularyWords.length > 0 && (
            <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${drawerOpen ? 'bg-white/30 text-white' : 'bg-vocab text-white'}`}>
              {vocabularyWords.length}
            </span>
          )}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            savedWords={vocabularyWords.filter((e) => e.sourceMessageId === msg.id)}
            onWordClick={(word) => { setHighlightedWord(word); setDrawerOpen(true) }}
          />
        ))}
        {loadingLabel && (
          <div className="flex items-center gap-2 text-xs text-ink-muted italic">
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ink-muted opacity-40 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-ink-muted opacity-60 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-ink-muted opacity-80 animate-bounce [animation-delay:300ms]" />
            </span>
            {loadingLabel}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 bg-rouge-50 border border-rouge/20 rounded-xl px-4 py-3 text-sm text-rouge">
            <span>⚠️</span>
            <span className="flex-1">{error}</span>
          </div>
        )}
      </div>

      <div className="relative px-5">
        {showAutocomplete && (
          <ul className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-border rounded-xl shadow-lg overflow-hidden z-10">
            {COMMANDS.filter((c) => c.command.startsWith(input)).map((c) => (
              <li key={c.command}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setInput(`${c.command} `)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-tricolore-50 flex gap-3 items-center transition-colors"
                >
                  <span className="text-base">📖</span>
                  <div>
                    <span className="block text-sm font-semibold text-tricolore">{c.command}</span>
                    <span className="block text-xs text-ink-muted">{c.description}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-5 py-3 border-t border-border bg-white flex-shrink-0">
        <VoiceInputButton
          onTranscription={(text) => setInput((prev) => prev ? `${prev} ${text}` : text)}
          onVoiceStateChange={handleVoiceStateChange}
          disabled={loading}
        />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={inputPlaceholder}
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-parchment border border-border rounded-full text-sm outline-none focus:border-tricolore focus:bg-white transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          aria-label="Envoyer"
          disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-full bg-tricolore hover:bg-tricolore-700 disabled:bg-border text-white flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" /><path d="M22 2L15 22 11 13 2 9l20-7z" />
          </svg>
        </button>
      </form>
      </div>

      <VocabularyDrawer
        entries={vocabularyWords}
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setHighlightedWord(null) }}
        highlightedWord={highlightedWord ?? undefined}
        conversationTitle={conversations.find((c) => c.id === conversationId)?.title}
      />
    </div>
  )
}
