import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessage } from './chat-message'
import { Message, MessageSender } from '../domain/entities/message'

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
})
