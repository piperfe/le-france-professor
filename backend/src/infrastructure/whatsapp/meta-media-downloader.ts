import { Span } from '../telemetry/decorators';

export class MetaMediaDownloader {
  constructor(private readonly accessToken: string) {}

  @Span()
  async download(mediaId: string): Promise<Buffer> {
    const metaResponse = await fetch(`https://graph.facebook.com/v25.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!metaResponse.ok) {
      throw new Error(`Meta API error ${metaResponse.status}: failed to get media URL`);
    }

    const { url } = (await metaResponse.json()) as { url: string };

    const audioResponse = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!audioResponse.ok) {
      throw new Error(`Meta API error ${audioResponse.status}: failed to download audio`);
    }

    return Buffer.from(await audioResponse.arrayBuffer());
  }
}
