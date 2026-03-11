import type { TtsRepository } from '../../domain/repositories/tts-repository'
import { ServiceUnavailableError } from '../../domain/errors'

export class HttpTtsRepository implements TtsRepository {
  constructor(private ttsUrl: string) {}

  async synthesize(text: string, lengthScale?: number): Promise<{ audio: Blob }> {
    const response = await fetch(`${this.ttsUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, ...(lengthScale !== undefined && { length_scale: lengthScale }) }),
    })

    if (!response.ok) {
      throw new ServiceUnavailableError('Failed to synthesize speech')
    }

    const arrayBuffer = await response.arrayBuffer()
    return { audio: new Blob([arrayBuffer], { type: 'audio/wav' }) }
  }
}
