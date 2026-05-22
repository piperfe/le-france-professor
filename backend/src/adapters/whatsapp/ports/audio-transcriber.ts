export interface AudioTranscriber {
  transcribe(audio: Buffer): Promise<string>;
}
