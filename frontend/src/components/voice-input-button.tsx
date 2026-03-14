'use client'

import { useState } from 'react'
import { useVoiceInput } from './use-voice-input'
import type { VoiceState } from './use-voice-input'

interface Props {
  onTranscription: (text: string) => void
  onVoiceStateChange?: (state: VoiceState, seconds: number) => void
  disabled?: boolean
}

export function VoiceInputButton({ onTranscription, onVoiceStateChange, disabled = false }: Props) {
  const [supported] = useState(
    () => typeof window !== 'undefined' && 'MediaRecorder' in window && 'mediaDevices' in navigator,
  )
  const [touchDevice] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )

  const { voiceState, errorMessage, startRecording, stopRecording, clearError } =
    useVoiceInput(onTranscription, onVoiceStateChange)

  if (!supported) return null

  const isRecording = voiceState === 'recording'
  const isBusy = disabled || voiceState === 'transcribing'

  // Desktop/mouse: click-to-toggle
  function handleClick() {
    if (touchDevice) return
    if (isRecording) stopRecording()
    else startRecording()
  }

  // Mobile/touch: press-and-hold
  function handleTouchStart(e: React.TouchEvent) {
    e.preventDefault()
    if (!isBusy) startRecording()
  }

  function handleTouchEnd() {
    stopRecording()
  }

  return (
    <div className="relative">
      {voiceState === 'error' && errorMessage && (
        <div
          role="alert"
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 text-center"
        >
          {errorMessage}
          <button
            type="button"
            onClick={clearError}
            className="block mx-auto mt-1 text-blue-600 underline"
          >
            Réessayer
          </button>
        </div>
      )}
      <button
        type="button"
        aria-label={isRecording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement vocal"}
        aria-pressed={isRecording}
        disabled={isBusy}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={[
          'w-10 h-10 rounded-full flex items-center justify-center transition-colors border',
          isRecording
            ? 'bg-rouge border-rouge text-white animate-pulse'
            : 'bg-parchment border-border text-ink-muted hover:bg-border',
          isBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        {voiceState === 'transcribing' ? (
          <span className="text-xs text-gray-400">…</span>
        ) : (
          <MicIcon active={isRecording} />
        )}
      </button>
    </div>
  )
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={active ? 'white' : 'currentColor'}
      aria-hidden="true"
    >
      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-7 8a7 7 0 0 0 14 0h2a9 9 0 0 1-8 8.94V22h-2v-2.06A9 9 0 0 1 3 11h2z" />
    </svg>
  )
}
