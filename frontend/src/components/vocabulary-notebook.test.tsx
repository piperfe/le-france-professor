import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VocabularyNotebook } from './vocabulary-notebook'
import type { VocabularyEntryDTO } from './vocabulary-notebook'
import { useVocabularyNotebook } from './use-vocabulary-notebook'

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

// Wrapper that wires VocabularyNotebook to the hook for interaction tests.
// Exposes a "open with word" test button to trigger openWithWord externally.
function NotebookWithHook({
  entries,
  wordToOpen,
}: {
  entries: VocabularyEntryDTO[]
  wordToOpen?: string
}) {
  const notebook = useVocabularyNotebook()
  return (
    <>
      <VocabularyNotebook
        entries={entries}
        isOpen={notebook.isOpen}
        highlightedWord={notebook.highlightedWord}
        onOpen={notebook.open}
        onClose={notebook.close}
      />
      {wordToOpen && (
        <button onClick={() => notebook.openWithWord(wordToOpen)}>open with word</button>
      )}
    </>
  )
}

describe('VocabularyNotebook — drawer content', () => {
  it('does not show entry words when the drawer is closed', () => {
    render(
      <VocabularyNotebook
        entries={[entry()]}
        isOpen={false}
        highlightedWord={null}
        onOpen={() => {}}
        onClose={() => {}}
      />,
    )

    expect(screen.queryByText('incontournable')).not.toBeInTheDocument()
  })

  it('shows empty state when there are no entries', () => {
    render(
      <VocabularyNotebook
        entries={[]}
        isOpen={true}
        highlightedWord={null}
        onOpen={() => {}}
        onClose={() => {}}
      />,
    )

    expect(screen.getByText(/aucun mot enregistré/i)).toBeInTheDocument()
  })

  it('lists all saved words and their explanations', () => {
    render(
      <VocabularyNotebook
        entries={[
          entry({ id: 'v-1', word: 'incontournable' }),
          entry({ id: 'v-2', word: 'passée', explanation: '«Passée» est le participe passé.' }),
        ]}
        isOpen={true}
        highlightedWord={null}
        onOpen={() => {}}
        onClose={() => {}}
      />,
    )

    expect(screen.getByText('incontournable')).toBeInTheDocument()
    expect(screen.getByText('passée')).toBeInTheDocument()
    expect(screen.getByText('«Passée» est le participe passé.')).toBeInTheDocument()
  })

  it('visually marks the highlighted word entry', () => {
    render(
      <VocabularyNotebook
        entries={[
          entry({ id: 'v-1', word: 'incontournable' }),
          entry({ id: 'v-2', word: 'passée' }),
        ]}
        isOpen={true}
        highlightedWord="incontournable"
        onOpen={() => {}}
        onClose={() => {}}
      />,
    )

    const items = screen.getAllByRole('listitem')
    const highlighted = items.find((li) => li.className.includes('bg-vocab-50'))
    expect(highlighted).toBeDefined()
    expect(highlighted).toHaveTextContent('incontournable')
  })

  it('highlight matching is case-insensitive', () => {
    render(
      <VocabularyNotebook
        entries={[entry({ word: 'Incontournable' })]}
        isOpen={true}
        highlightedWord="incontournable"
        onOpen={() => {}}
        onClose={() => {}}
      />,
    )

    const items = screen.getAllByRole('listitem')
    expect(items[0].className).toContain('bg-vocab-50')
  })

  it('shows the conversation title in the drawer sub-header when provided', () => {
    render(
      <VocabularyNotebook
        entries={[entry()]}
        isOpen={true}
        highlightedWord={null}
        onOpen={() => {}}
        onClose={() => {}}
        conversationTitle="La cuisine française"
      />,
    )

    expect(screen.getByText('La cuisine française')).toBeInTheDocument()
  })

  it('no entry is highlighted when highlightedWord is null', () => {
    render(
      <VocabularyNotebook
        entries={[entry()]}
        isOpen={true}
        highlightedWord={null}
        onOpen={() => {}}
        onClose={() => {}}
      />,
    )

    const items = screen.getAllByRole('listitem')
    expect(items[0].className).not.toContain('bg-vocab-50')
  })
})

describe('VocabularyNotebook — badge and interactions', () => {
  it('shows badge count when entries are provided', () => {
    render(<NotebookWithHook entries={[entry()]} />)

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('opens the drawer and shows saved words when the badge button is clicked', async () => {
    const user = userEvent.setup()
    render(<NotebookWithHook entries={[entry()]} />)

    await user.click(screen.getByRole('button', { name: /carnet de vocabulaire/i }))

    expect(screen.getByText('incontournable')).toBeInTheDocument()
    expect(screen.getByText("C'est un adjectif qui signifie essentiel.")).toBeInTheDocument()
  })

  it('closes the drawer when the close button is clicked', async () => {
    const user = userEvent.setup()
    render(<NotebookWithHook entries={[entry()]} />)

    await user.click(screen.getByRole('button', { name: /carnet de vocabulaire/i }))
    expect(screen.getByRole('button', { name: 'Fermer le carnet' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Fermer le carnet' }))

    expect(screen.queryByRole('button', { name: 'Fermer le carnet' })).not.toBeInTheDocument()
  })

  it('closes the drawer when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    render(<NotebookWithHook entries={[entry()]} />)

    await user.click(screen.getByRole('button', { name: /carnet de vocabulaire/i }))
    expect(screen.getByRole('button', { name: 'Fermer le carnet' })).toBeInTheDocument()

    await user.click(document.querySelector('.bg-black\\/20')!)

    expect(screen.queryByRole('button', { name: 'Fermer le carnet' })).not.toBeInTheDocument()
  })

  it('opens the drawer with the word highlighted when openWithWord is called', () => {
    render(
      <NotebookWithHook
        entries={[entry({ word: 'aider' })]}
        wordToOpen="aider"
      />,
    )

    fireEvent.click(screen.getByText('open with word'))

    expect(screen.getByRole('button', { name: 'Fermer le carnet' })).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    const highlighted = items.find((li) => li.className.includes('bg-vocab-50'))
    expect(highlighted).toBeDefined()
    expect(highlighted).toHaveTextContent('aider')
  })
})
