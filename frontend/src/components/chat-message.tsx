'use client'

import type { Message } from '../domain/entities/message'
import { MessageSender } from '../domain/entities/message'
import { TtsButton } from './tts-button'
import type { VocabularyEntryDTO } from './vocabulary-notebook'

interface Props {
  message: Message
  savedWords?: VocabularyEntryDTO[]
  onWordClick?: (word: string) => void
}

function highlightWords(
  text: string,
  words: string[],
  onWordClick: (word: string) => void,
): React.ReactNode {
  if (words.length === 0) return text

  const pattern = new RegExp(
    `(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi',
  )
  const parts = text.split(pattern)

  return parts.map((part, i) => {
    const isHighlighted = words.some((w) => w.toLowerCase() === part.toLowerCase())
    if (isHighlighted) {
      return (
        <mark
          key={i}
          className="bg-vocab/[0.13] text-vocab font-semibold rounded-sm px-0.5 cursor-pointer border-b-2 border-vocab/40 hover:bg-vocab/20 transition-colors not-italic whitespace-nowrap"
          onClick={() => onWordClick(part)}
        >
          {part}
        </mark>
      )
    }
    return part
  })
}

export function ChatMessage({ message, savedWords = [], onWordClick }: Props) {
  const isTutor = message.sender === MessageSender.TUTOR

  if (message.type === 'vocabulary') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] flex flex-col items-start gap-1">
          <div className="rounded-xl border px-3 py-2.5 bg-vocab-50 border-vocab/30 w-full">
            <span className="block text-xs font-bold text-vocab mb-1">
              📖 {message.vocabularyWord ?? ''}
            </span>
            <p className="text-xs text-ink leading-relaxed">{message.content}</p>
          </div>
          <TtsButton text={message.content} />
        </div>
      </div>
    )
  }

  const wordNames = savedWords.map((e) => e.word)

  return (
    <div className={`flex ${isTutor ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[75%] ${isTutor ? 'flex flex-col items-start' : ''}`}>
        <div
          className={`px-4 py-3 text-sm leading-relaxed ${
            isTutor
              ? 'bg-white border border-border text-ink rounded-2xl rounded-bl-sm'
              : 'bg-tricolore text-white rounded-2xl rounded-br-sm'
          }`}
        >
          {isTutor && wordNames.length > 0
            ? highlightWords(message.content, wordNames, onWordClick ?? (() => {}))
            : message.content}
        </div>
        {isTutor && <TtsButton text={message.content} />}
      </div>
    </div>
  )
}
