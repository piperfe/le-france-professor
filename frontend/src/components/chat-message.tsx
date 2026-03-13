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
        <div className="max-w-[70%] flex flex-col items-start">
          <span className="text-xs font-medium text-indigo-500 mb-1 px-1">
            📖 {message.vocabularyWord ?? ''}
          </span>
          <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed bg-indigo-50 border-l-2 border-indigo-300 text-gray-900">
            {message.content}
          </div>
          <TtsButton text={message.content} />
        </div>
      </div>
    )
  }

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
