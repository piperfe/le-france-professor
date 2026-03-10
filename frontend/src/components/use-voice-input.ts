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

export function useVoiceInput(
  onTranscription: (text: string) => void,
  onVoiceStateChange?: (state: VoiceState, seconds: number) => void,
): UseVoiceInputResult {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const secondsRef = useRef(0)

  function notify(state: VoiceState, seconds = 0) {
    setVoiceState(state)
    onVoiceStateChange?.(state, seconds)
  }

  function startTimer() {
    secondsRef.current = 0
    timerRef.current = setInterval(() => {
      secondsRef.current += 1
      onVoiceStateChange?.('recording', secondsRef.current)
    }, 1000)
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    secondsRef.current = 0
  }

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
        stopTimer()
        streamRef.current?.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        chunksRef.current = []
        notify('transcribing')

        const form = new FormData()
        form.append('audio', blob, 'recording.webm')

        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: form })

          if (!res.ok) {
            setErrorMessage('La transcription a échoué. Réessayez.')
            notify('error')
            return
          }

          const { text } = await res.json()

          if (!text?.trim()) {
            setErrorMessage('Aucune parole détectée. Réessayez.')
            notify('error')
            return
          }

          onTranscription(text.trim())
          notify('idle')
        } catch {
          setErrorMessage('La transcription a échoué. Réessayez.')
          notify('error')
        }
      }

      recorderRef.current = recorder
      recorder.start()
      startTimer()
      notify('recording', 0)
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Accès au microphone refusé. Vérifiez les permissions de votre navigateur.'
          : "Impossible d'accéder au microphone."
      setErrorMessage(msg)
      notify('error')
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }

  function clearError() {
    notify('idle')
  }

  return { voiceState, errorMessage, startRecording, stopRecording, clearError }
}
