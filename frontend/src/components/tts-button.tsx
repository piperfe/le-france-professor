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
    <div className="flex gap-1 mt-2">
      <button
        type="button"
        aria-label={speakerIsActive ? 'Arrêter la lecture' : 'Écouter en français'}
        onClick={() => play(text)}
        disabled={isLoading}
        className={[
          'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
          speakerIsActive
            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-500',
          isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        {speakerIsLoading ? (
          <span className="text-xs text-gray-400">…</span>
        ) : speakerIsActive ? (
          <StopIcon />
        ) : (
          <SpeakerIcon />
        )}
      </button>

      <button
        type="button"
        aria-label={slowIsActive ? 'Arrêter la lecture lente' : 'Écouter lentement'}
        onClick={() => playSlow(text)}
        disabled={isLoading}
        className={[
          'w-7 h-7 rounded-md flex items-center justify-center transition-colors text-sm',
          slowIsActive
            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-500',
          isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        {slowIsLoading ? <span className="text-xs text-gray-400">…</span> : '🐢'}
      </button>
    </div>
  )
}
