'use client'

import type { Message } from '../domain/entities/message'
import { MessageSender } from '../domain/entities/message'
import { TtsButton } from './tts-button'

interface Props {
  message: Message
}

export function ChatMessage({ message }: Props) {
  const isTutor = message.sender === MessageSender.TUTOR

  return (
    <div className={`flex ${isTutor ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[70%] ${isTutor ? 'flex flex-col items-start' : ''}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isTutor
              ? 'bg-white border border-gray-200 text-gray-900'
              : 'bg-blue-600 text-white'
          }`}
        >
          {message.content}
        </div>
        {isTutor && <TtsButton text={message.content} />}
      </div>
    </div>
  )
}
