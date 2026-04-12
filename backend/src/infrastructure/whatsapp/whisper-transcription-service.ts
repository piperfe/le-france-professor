import type { AudioTranscriber } from '../../domain/services/audio-transcriber';
import { ServiceUnavailableError } from '../../domain/errors';
import { convertOggToWav } from './ogg-to-wav-converter';
import { Span } from '../telemetry/decorators';

export class WhisperTranscriptionService implements AudioTranscriber {
  constructor(
    private readonly whisperUrl: string,
    private readonly audioConverter: (audio: Buffer) => Promise<Buffer> = convertOggToWav,
  ) {}

  @Span()
  async transcribe(audio: Buffer): Promise<string> {
    const wav = await this.audioConverter(audio);

    const form = new FormData();
    form.append('file', new Blob([wav], { type: 'audio/wav' }), 'audio.wav');
    form.append('response_format', 'json');
    form.append('language', 'fr');

    const response = await fetch(`${this.whisperUrl}/inference`, {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      throw new ServiceUnavailableError('Failed to transcribe audio');
    }

    const { text } = (await response.json()) as { text: string };
    return text;
  }
}
