import { useState } from 'react'

interface UseVocabularyNotebookResult {
  isOpen: boolean
  highlightedWord: string | null
  open: () => void
  openWithWord: (word: string) => void
  close: () => void
}

export function useVocabularyNotebook(): UseVocabularyNotebookResult {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null)

  function open() {
    setIsOpen(true)
  }

  function openWithWord(word: string) {
    setHighlightedWord(word)
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
    setHighlightedWord(null)
  }

  return { isOpen, highlightedWord, open, openWithWord, close }
}
