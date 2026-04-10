export interface WhatsAppSender {
  sendMessage(to: string, body: string): Promise<void>;
}
