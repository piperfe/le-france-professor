export interface WhatsAppSender {
  sendMessage(to: string, body: string): Promise<void>;
  sendDocument(to: string, buffer: Buffer, filename: string): Promise<void>;
}
