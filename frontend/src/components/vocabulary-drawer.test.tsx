import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VocabularyDrawer } from './vocabulary-drawer'
import type { VocabularyEntryDTO } from './vocabulary-drawer'

function entry(overrides: Partial<VocabularyEntryDTO> = {}): VocabularyEntryDTO {
  return {
    id: 'v-1',
    word: 'incontournable',
    explanation: "C'est un adjectif qui signifie essentiel.",
    sourceMessageId: 'msg-1',
    conversationId: 'conv-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('VocabularyDrawer', () => {
  it('renders nothing when closed', () => {
    render(<VocabularyDrawer entries={[entry()]} isOpen={false} onClose={() => {}} />)

    expect(screen.queryByText('incontournable')).not.toBeInTheDocument()
  })

  it('shows empty state when there are no entries', () => {
    render(<VocabularyDrawer entries={[]} isOpen={true} onClose={() => {}} />)

    expect(screen.getByText(/aucun mot enregistré/i)).toBeInTheDocument()
  })

  it('lists all saved words and their explanations', () => {
    render(
      <VocabularyDrawer
        entries={[
          entry({ id: 'v-1', word: 'incontournable' }),
          entry({ id: 'v-2', word: 'passée', explanation: '«Passée» est le participe passé.' }),
        ]}
        isOpen={true}
        onClose={() => {}}
      />,
    )

    expect(screen.getByText('incontournable')).toBeInTheDocument()
    expect(screen.getByText('passée')).toBeInTheDocument()
    expect(screen.getByText('«Passée» est le participe passé.')).toBeInTheDocument()
  })

  it('visually marks the highlighted word entry', () => {
    render(
      <VocabularyDrawer
        entries={[
          entry({ id: 'v-1', word: 'incontournable' }),
          entry({ id: 'v-2', word: 'passée' }),
        ]}
        isOpen={true}
        onClose={() => {}}
        highlightedWord="incontournable"
      />,
    )

    // The highlighted entry carries the active style class
    const items = screen.getAllByRole('listitem')
    const highlighted = items.find((li) => li.className.includes('bg-vocab-50'))
    expect(highlighted).toBeDefined()
    expect(highlighted).toHaveTextContent('incontournable')
  })

  it('matching is case-insensitive — highlight works regardless of capitalisation', () => {
    render(
      <VocabularyDrawer
        entries={[entry({ word: 'Incontournable' })]}
        isOpen={true}
        onClose={() => {}}
        highlightedWord="incontournable"
      />,
    )

    const items = screen.getAllByRole('listitem')
    expect(items[0].className).toContain('bg-vocab-50')
  })

  it('no entry is highlighted when highlightedWord is not provided', () => {
    render(
      <VocabularyDrawer entries={[entry()]} isOpen={true} onClose={() => {}} />,
    )

    const items = screen.getAllByRole('listitem')
    expect(items[0].className).not.toContain('bg-vocab-50')
  })
})
