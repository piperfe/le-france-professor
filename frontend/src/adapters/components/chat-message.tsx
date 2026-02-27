import { Message, MessageSender } from '../../domain/entities/message';
import './ChatMessage.css';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === MessageSender.USER;
  return (
    <div className={`chat-message ${isUser ? 'user' : 'tutor'}`}>
      <div className="message-content">{message.content}</div>
      <div className="message-timestamp">
        {message.timestamp.toLocaleTimeString()}
      </div>
    </div>
  );
}
