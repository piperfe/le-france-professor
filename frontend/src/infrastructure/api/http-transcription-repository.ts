import type { TranscriptionRepository } from '../../domain/repositories/transcription-repository'
import { ServiceUnavailableError } from '../../domain/errors'
import { convertToWav } from './audio-converter'

export class HttpTranscriptionRepository implements TranscriptionRepository {
  constructor(
    private whisperUrl: string,
    private audioConverter: (audio: Blob) => Promise<Blob> = convertToWav,
  ) {}

  async transcribe(audio: Blob): Promise<{ text: string }> {
    const wav = await this.audioConverter(audio)

    const form = new FormData()
    form.append('file', wav, 'audio.wav')
    form.append('response_format', 'json')
    form.append('language', 'fr')

    const response = await fetch(`${this.whisperUrl}/inference`, {
      method: 'POST',
      body: form,
    })

    if (!response.ok) {
      throw new ServiceUnavailableError('Failed to transcribe audio')
    }

    return response.json()
  }
}
