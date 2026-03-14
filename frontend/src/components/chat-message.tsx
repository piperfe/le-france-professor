'use client'

import type { Message } from '../domain/entities/message'
import { MessageSender } from '../domain/entities/message'
import { TtsButton } from './tts-button'

interface Props {
  message: Message
}

export function ChatMessage({ message }: Props) {
  const isTutor = message.sender === MessageSender.TUTOR

  if (message.type === 'vocabulary') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] flex flex-col items-start">
          <span className="text-xs font-semibold text-vocab uppercase tracking-wide mb-1.5 px-1">
            📖 {message.vocabularyWord ?? ''}
          </span>
          <div className="px-4 py-3 rounded-xl text-sm leading-relaxed bg-vocab-50 border border-vocab/20 border-l-[3px] border-l-vocab text-ink">
            {message.content}
          </div>
          <TtsButton text={message.content} />
        </div>
      </div>
    )
  }

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
          {message.content}
        </div>
        {isTutor && <TtsButton text={message.content} />}
      </div>
    </div>
  )
}
