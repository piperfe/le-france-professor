import { Span } from '../telemetry/decorators';
import type { WhatsAppSender } from '../../domain/services/whatsapp-sender';

export class MetaWhatsAppClient implements WhatsAppSender {
  constructor(
    private readonly accessToken: string,
    private readonly phoneNumberId: string,
  ) {}

  @Span()
  async sendMessage(to: string, body: string): Promise<void> {
    const url = `https://graph.facebook.com/v25.0/${this.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Meta API error ${response.status}: ${text}`);
    }
  }
}
