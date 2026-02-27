import { useState, FormEvent } from 'react';
import { useConversation } from '../hooks/use-conversation';
import { CreateConversationUseCase } from '../../application/use-cases/create-conversation-use-case';
import { SendMessageUseCase } from '../../application/use-cases/send-message-use-case';
import { GetConversationUseCase } from '../../application/use-cases/get-conversation-use-case';
import { ChatMessage } from './chat-message';
import './ChatInterface.css';

interface ChatInterfaceProps {
  createUseCase: CreateConversationUseCase;
  sendUseCase: SendMessageUseCase;
  getUseCase: GetConversationUseCase;
}

export function ChatInterface({
  createUseCase,
  sendUseCase,
  getUseCase,
}: ChatInterfaceProps) {
  const { conversation, loading, error, startConversation, sendMessage } =
    useConversation(createUseCase, sendUseCase, getUseCase);
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;
    if (!conversation) {
      await startConversation();
    } else {
      await sendMessage(inputValue);
      setInputValue('');
    }
  };

  if (!conversation) {
    return (
      <div className="chat-interface">
        <div className="welcome-screen">
          <h1>Bienvenue au Le France Professor</h1>
          <p>Commencez une conversation pour apprendre le français !</p>
          <button
            onClick={startConversation}
            disabled={loading}
            className="start-button"
          >
            {loading ? 'Démarrage...' : 'Commencer'}
          </button>
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h2>Conversation en français</h2>
      </div>
      <div className="chat-messages">
        {conversation.messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {loading && <div className="loading">Le tuteur écrit...</div>}
      </div>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Tapez votre message en français..."
          disabled={loading}
          className="chat-input"
        />
        <button type="submit" disabled={loading || !inputValue.trim()}>
          Envoyer
        </button>
      </form>
    </div>
  );
}
