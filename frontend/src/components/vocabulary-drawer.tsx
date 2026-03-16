'use client'

import { useEffect, useRef } from 'react'

export interface VocabularyEntryDTO {
  id: string
  word: string
  explanation: string
  sourceMessageId: string
  conversationId: string
  createdAt: string
}

interface Props {
  entries: VocabularyEntryDTO[]
  isOpen: boolean
  onClose: () => void
  highlightedWord?: string
  conversationTitle?: string
}

export function VocabularyDrawer({ entries, isOpen, onClose, highlightedWord, conversationTitle }: Props) {
  const highlightedRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (isOpen && highlightedWord && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isOpen, highlightedWord])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Panel — bottom sheet on mobile, side drawer on md+ */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[70%] rounded-t-2xl overflow-hidden shadow-2xl flex flex-col bg-white
                   md:top-0 md:bottom-0 md:right-0 md:left-auto md:h-screen md:w-80 md:rounded-none md:shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0 md:hidden">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <h3 className="font-display font-semibold text-ink text-sm flex items-center gap-2">
            📖 Vocabulaire
            {entries.length > 0 && (
              <span className="inline-flex items-center justify-center bg-vocab text-white text-[9px] font-bold rounded-full px-1.5 py-px">
                {entries.length}
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le carnet"
            className="w-6 h-6 rounded-full bg-parchment flex items-center justify-center text-xs text-ink-muted hover:bg-border transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Conversation title sub-header */}
        {conversationTitle && (
          <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-muted bg-cream border-b border-border truncate flex-shrink-0">
            {conversationTitle}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3">
          {entries.length === 0 ? (
            <p className="text-sm text-ink-muted italic text-center mt-8">
              Aucun mot enregistré pour l&apos;instant.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {entries.map((entry) => {
                const isActive = highlightedWord?.toLowerCase() === entry.word.toLowerCase()
                return (
                  <li
                    key={entry.id}
                    ref={isActive ? highlightedRef : null}
                    className={`rounded-xl border px-3 py-2.5 transition-colors ${
                      isActive ? 'bg-vocab-50 border-vocab/30' : 'bg-cream border-border'
                    }`}
                  >
                    <span className="block text-xs font-bold text-vocab mb-1">
                      {entry.word}
                    </span>
                    <p className="text-xs text-ink leading-relaxed">{entry.explanation}</p>
                    <p className="text-[10px] text-ink-muted mt-1.5">
                      {new Date(entry.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
