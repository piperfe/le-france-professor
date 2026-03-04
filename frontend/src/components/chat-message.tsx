import type { Message} from '../domain/entities/message';
import { MessageSender } from '../domain/entities/message'

interface Props {
  message: Message
}

export function ChatMessage({ message }: Props) {
  const isTutor = message.sender === MessageSender.TUTOR

  return (
    <div className={`flex ${isTutor ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isTutor
            ? 'bg-white border border-gray-200 text-gray-900'
            : 'bg-blue-600 text-white'
        }`}
      >
        {message.content}
      </div>
    </div>
  )
}
