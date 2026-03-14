'use client'

import { useTts } from './use-tts'

interface Props {
  text: string
}

function SpeakerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4"
    >
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  )
}

export function TtsButton({ text }: Props) {
  const { ttsState, activeSpeed, play, playSlow } = useTts()

  const isLoading = ttsState === 'loading'
  const isPlaying = ttsState === 'playing'
  // Active = playing at this specific speed (not just loading it)
  const speakerIsActive = isPlaying && activeSpeed === 'normal'
  const slowIsActive    = isPlaying && activeSpeed === 'slow'
  // Which button triggered the current fetch (for the loading indicator)
  const speakerIsLoading = isLoading && activeSpeed === 'normal'
  const slowIsLoading    = isLoading && activeSpeed === 'slow'

  return (
    <div className="flex gap-1.5 mt-2">
      <button
        type="button"
        aria-label={speakerIsActive ? 'Arrêter la lecture' : 'Écouter en français'}
        onClick={() => play(text)}
        disabled={isLoading}
        className={[
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
          speakerIsActive
            ? 'bg-tricolore-50 border-tricolore text-tricolore hover:bg-tricolore/10'
            : 'bg-parchment border-[#B8B0A6] text-ink-muted hover:bg-border',
          isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        {speakerIsLoading ? (
          <span>…</span>
        ) : speakerIsActive ? (
          <><StopIcon /> Normal</>
        ) : (
          <><SpeakerIcon /> Normal</>
        )}
      </button>

      <button
        type="button"
        aria-label={slowIsActive ? 'Arrêter la lecture lente' : 'Écouter lentement'}
        onClick={() => playSlow(text)}
        disabled={isLoading}
        className={[
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
          slowIsActive
            ? 'bg-tricolore-50 border-tricolore text-tricolore hover:bg-tricolore/10'
            : 'bg-parchment border-[#B8B0A6] text-ink-muted hover:bg-border',
          isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        {slowIsLoading ? <span>…</span> : '🐢 Lent'}
      </button>
    </div>
  )
}
