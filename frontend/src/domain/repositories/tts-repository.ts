export interface TtsRepository {
  synthesize(text: string, lengthScale?: number): Promise<{ audio: Blob }>
}
