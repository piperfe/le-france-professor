import { useState, useRef } from 'react'

export type TtsState = 'idle' | 'loading' | 'playing'

// 1.5 = 50% slower than normal — changes phoneme duration at synthesis time (more natural than browser playbackRate)
const SLOW_LENGTH_SCALE = 1.5

// Module-level singleton: ensures only one audio plays at a time across all TtsButton instances.
let activeAudio: HTMLAudioElement | null = null
let activeObjectUrl: string | null = null
let activeNotifyIdle: (() => void) | null = null

function stopGlobal() {
  activeAudio?.pause()
  activeAudio = null
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl)
    activeObjectUrl = null
  }
  activeNotifyIdle?.()
  activeNotifyIdle = null
}

interface UseTtsResult {
  ttsState: TtsState
  activeSpeed: 'normal' | 'slow' | null
  play: (text: string) => Promise<void>
  playSlow: (text: string) => Promise<void>
}

export function useTts(): UseTtsResult {
  const [ttsState, setTtsState] = useState<TtsState>('idle')
  const [activeSpeed, setActiveSpeed] = useState<'normal' | 'slow' | null>(null)
  const isActiveRef = useRef(false)
  const activeLengthScaleRef = useRef<number | null>(null)

  async function fetchAndPlay(text: string, lengthScale: number): Promise<void> {
    const speed: 'normal' | 'slow' = lengthScale === 1.0 ? 'normal' : 'slow'

    // Toggle: clicking the same speed while active stops playback
    if (isActiveRef.current && activeLengthScaleRef.current === lengthScale) {
      stopGlobal()
      isActiveRef.current = false
      activeLengthScaleRef.current = null
      return
    }

    // Stop any other instance (different message or different speed on this message)
    stopGlobal()
    setTtsState('loading')
    setActiveSpeed(speed)

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lengthScale }),
      })

      if (!res.ok) {
        setTtsState('idle')
        setActiveSpeed(null)
        return
      }

      const arrayBuffer = await res.arrayBuffer()
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)

      activeAudio = audio
      activeObjectUrl = url
      isActiveRef.current = true
      activeLengthScaleRef.current = lengthScale
      // Stored so stopGlobal() can reset this instance's UI if another button takes over
      activeNotifyIdle = () => {
        isActiveRef.current = false
        activeLengthScaleRef.current = null
        setTtsState('idle')
        setActiveSpeed(null)
      }

      audio.onended = () => {
        if (isActiveRef.current) {
          URL.revokeObjectURL(url)
          activeAudio = null
          activeObjectUrl = null
          activeNotifyIdle = null
          isActiveRef.current = false
          activeLengthScaleRef.current = null
          setTtsState('idle')
          setActiveSpeed(null)
        }
      }

      await audio.play()
      setTtsState('playing')
    } catch {
      isActiveRef.current = false
      activeLengthScaleRef.current = null
      setTtsState('idle')
      setActiveSpeed(null)
    }
  }

  return {
    ttsState,
    activeSpeed,
    play: (text) => fetchAndPlay(text, 1.0),
    playSlow: (text) => fetchAndPlay(text, SLOW_LENGTH_SCALE),
  }
}
