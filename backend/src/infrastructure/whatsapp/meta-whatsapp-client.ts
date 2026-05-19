import { Span } from '../telemetry/decorators';
import type { WhatsAppSender } from '../../domain/services/whatsapp-sender';

export class MetaWhatsAppClient implements WhatsAppSender {
  constructor(
    private readonly accessToken: string,
    private readonly phoneNumberId: string,
  ) {}

  @Span()
  async sendDocument(to: string, buffer: Buffer, filename: string): Promise<void> {
    const base = `https://graph.facebook.com/v25.0/${this.phoneNumberId}`;

    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'application/pdf');
    form.append('file', new Blob([buffer], { type: 'application/pdf' }), filename);

    const uploadResp = await fetch(`${base}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}` },
      body: form,
    });
    if (!uploadResp.ok) {
      const text = await uploadResp.text();
      throw new Error(`Meta media upload error ${uploadResp.status}: ${text}`);
    }
    const { id: mediaId } = await uploadResp.json() as { id: string };

    const msgResp = await fetch(`${base}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'document',
        document: { id: mediaId, filename },
      }),
    });
    if (!msgResp.ok) {
      const text = await msgResp.text();
      throw new Error(`Meta API error ${msgResp.status}: ${text}`);
    }
  }

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
