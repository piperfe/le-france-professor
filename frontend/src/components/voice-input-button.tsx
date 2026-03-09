'use client'

import { useState, useRef } from 'react'

type VoiceState = 'idle' | 'recording' | 'transcribing' | 'error'

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus', // Chrome, Edge
    'audio/ogg;codecs=opus',  // Firefox
    'audio/mp4',              // Safari
    'audio/webm',             // fallback
  ]
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

interface Props {
  onTranscription: (text: string) => void
  disabled?: boolean
}

export function VoiceInputButton({ onTranscription, disabled = false }: Props) {
  const [supported] = useState(
    () => typeof window !== 'undefined' && 'MediaRecorder' in window && 'mediaDevices' in navigator,
  )
  const [touchDevice] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  if (!supported) return null

  const isRecording = voiceState === 'recording'
  const isBusy = disabled || voiceState === 'transcribing'

  async function startRecording() {
    if (isBusy || isRecording) return
    setErrorMessage(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        setVoiceState('transcribing')

        const form = new FormData()
        form.append('audio', blob, 'recording.webm')

        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: form })

          if (!res.ok) {
            setErrorMessage('La transcription a échoué. Réessayez.')
            setVoiceState('error')
            return
          }

          const { text } = await res.json()

          if (!text?.trim()) {
            setErrorMessage('Aucune parole détectée. Réessayez.')
            setVoiceState('error')
            return
          }

          onTranscription(text.trim())
          setVoiceState('idle')
        } catch {
          setErrorMessage('La transcription a échoué. Réessayez.')
          setVoiceState('error')
        }
      }

      recorderRef.current = recorder
      recorder.start()
      setVoiceState('recording')
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Accès au microphone refusé. Vérifiez les permissions de votre navigateur.'
          : "Impossible d'accéder au microphone."
      setErrorMessage(msg)
      setVoiceState('error')
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }

  // Desktop/mouse: click-to-toggle
  function handleClick() {
    if (touchDevice) return
    if (isRecording) stopRecording()
    else startRecording()
  }

  // Mobile/touch: press-and-hold
  function handleTouchStart(e: React.TouchEvent) {
    e.preventDefault()
    startRecording()
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
            onClick={() => setVoiceState('idle')}
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
          'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
          isRecording
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-600',
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
