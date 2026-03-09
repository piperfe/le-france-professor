import { useState, useRef } from 'react'

export type VoiceState = 'idle' | 'recording' | 'transcribing' | 'error'

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus', // Chrome, Edge
    'audio/ogg;codecs=opus',  // Firefox
    'audio/mp4',              // Safari
    'audio/webm',             // fallback
  ]
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

interface UseVoiceInputResult {
  voiceState: VoiceState
  errorMessage: string | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  clearError: () => void
}

export function useVoiceInput(onTranscription: (text: string) => void): UseVoiceInputResult {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  async function startRecording() {
    if (voiceState !== 'idle') return
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
        chunksRef.current = []
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

  function clearError() {
    setVoiceState('idle')
  }

  return { voiceState, errorMessage, startRecording, stopRecording, clearError }
}
