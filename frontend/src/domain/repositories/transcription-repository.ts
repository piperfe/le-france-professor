export interface TranscriptionRepository {
  transcribe(audio: Blob): Promise<{ text: string }>
}
