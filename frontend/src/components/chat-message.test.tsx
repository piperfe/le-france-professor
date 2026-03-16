import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatMessage } from './chat-message'
import { Message, MessageSender } from '../domain/entities/message'
import type { VocabularyEntryDTO } from './vocabulary-notebook'

// ── Audio mock ────────────────────────────────────────────────────────────────
// ChatMessage renders TtsButton for tutor messages, which uses HTMLAudioElement.
// We stub it here so the component can mount without browser audio APIs.

beforeEach(() => {
  vi.stubGlobal('Audio', class {
    playbackRate = 1
    onended = null
    pause = vi.fn()
    play = vi.fn().mockResolvedValue(undefined)
  })
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: vi.fn().mockReturnValue('blob:mock-url') })
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: vi.fn() })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── helpers ───────────────────────────────────────────────────────────────────

function tutorMessage(content = 'Bonjour ! Comment vas-tu ?') {
  return new Message('msg-1', content, MessageSender.TUTOR, new Date())
}

function userMessage(content = 'Je vais bien, merci !') {
  return new Message('msg-2', content, MessageSender.USER, new Date())
}

function vocabularyMessage(word = 'passée', content = '«Passée» est le participe passé féminin de «se passer».') {
  return new Message('msg-3', content, MessageSender.TUTOR, new Date(), 'vocabulary', word)
}

// ── helpers ───────────────────────────────────────────────────────────────────

function savedWord(overrides: Partial<VocabularyEntryDTO> = {}): VocabularyEntryDTO {
  return {
    id: 'v-1',
    word: 'incontournable',
    explanation: "C'est un adjectif qui signifie essentiel, unavoidable.",
    sourceMessageId: 'msg-1',
    conversationId: 'conv-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('ChatMessage', () => {
  it('displays the message content', () => {
    render(<ChatMessage message={tutorMessage('Bonjour !')} />)

    expect(screen.getByText('Bonjour !')).toBeInTheDocument()
  })

  it('shows speaker and slow-play buttons for a tutor message', () => {
    render(<ChatMessage message={tutorMessage()} />)

    expect(screen.getByRole('button', { name: /écouter en français/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /écouter lentement/i })).toBeInTheDocument()
  })

  it('does not show audio buttons for a student message', () => {
    render(<ChatMessage message={userMessage()} />)

    expect(screen.queryByRole('button', { name: /écouter en français/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /écouter lentement/i })).not.toBeInTheDocument()
  })

  describe('vocabulary bubble', () => {
    it('displays the word header with book emoji', () => {
      render(<ChatMessage message={vocabularyMessage('passée')} />)

      expect(screen.getByText('📖 passée')).toBeInTheDocument()
    })

    it('displays the explanation content', () => {
      render(<ChatMessage message={vocabularyMessage('passée', '«Passée» est le participe passé féminin de «se passer».')} />)

      expect(screen.getByText('«Passée» est le participe passé féminin de «se passer».')).toBeInTheDocument()
    })

    it('shows audio buttons so the student can hear the explanation', () => {
      render(<ChatMessage message={vocabularyMessage()} />)

      expect(screen.getByRole('button', { name: /écouter en français/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /écouter lentement/i })).toBeInTheDocument()
    })
  })

  describe('word highlights', () => {
    it('renders plain text when no savedWords provided', () => {
      render(<ChatMessage message={tutorMessage('C\'est incontournable pour progresser.')} />)

      expect(screen.queryByRole('mark')).not.toBeInTheDocument()
      expect(screen.getByText(/C'est incontournable pour progresser\./)).toBeInTheDocument()
    })

    it('highlights a saved word in the tutor message', () => {
      render(
        <ChatMessage
          message={tutorMessage("C'est incontournable pour progresser.")}
          savedWords={[savedWord()]}
        />,
      )

      expect(screen.getByRole('mark')).toHaveTextContent('incontournable')
    })

    it('does not highlight words in a student message', () => {
      render(
        <ChatMessage
          message={userMessage('incontournable')}
          savedWords={[savedWord()]}
        />,
      )

      expect(screen.queryByRole('mark')).not.toBeInTheDocument()
    })

    it('clicking a highlighted word calls onWordClick with the word text', () => {
      const onWordClick = vi.fn()
      render(
        <ChatMessage
          message={tutorMessage("C'est incontournable pour progresser.")}
          savedWords={[savedWord()]}
          onWordClick={onWordClick}
        />,
      )

      fireEvent.click(screen.getByRole('mark'))

      expect(onWordClick).toHaveBeenCalledWith('incontournable')
    })

    it('is case-insensitive — highlights match regardless of capitalisation', () => {
      render(
        <ChatMessage
          message={tutorMessage('Incontournable dans ce contexte.')}
          savedWords={[savedWord({ word: 'incontournable' })]}
        />,
      )

      expect(screen.getByRole('mark')).toHaveTextContent('Incontournable')
    })
  })
})
