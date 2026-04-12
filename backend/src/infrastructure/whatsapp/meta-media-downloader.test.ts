import nock from 'nock';
import { MetaMediaDownloader } from './meta-media-downloader';

const ACCESS_TOKEN = 'test-access-token';
const MEDIA_ID = 'media-id-abc123';
const AUDIO_URL = 'https://cdn.whatsapp.example.com/audio/file.ogg';

describe('MetaMediaDownloader', () => {
  let downloader: MetaMediaDownloader;

  beforeEach(() => {
    nock.cleanAll();
    downloader = new MetaMediaDownloader(ACCESS_TOKEN);
  });

  it('downloads the audio bytes for a given media ID', async () => {
    const audioBytes = Buffer.from('ogg-binary-data');

    nock('https://graph.facebook.com')
      .get(`/v25.0/${MEDIA_ID}`)
      .matchHeader('authorization', `Bearer ${ACCESS_TOKEN}`)
      .reply(200, { url: AUDIO_URL });

    nock('https://cdn.whatsapp.example.com')
      .get('/audio/file.ogg')
      .matchHeader('authorization', `Bearer ${ACCESS_TOKEN}`)
      .reply(200, audioBytes);

    const result = await downloader.download(MEDIA_ID);

    expect(result).toEqual(audioBytes);
  });

  it('throws when the Meta media lookup fails', async () => {
    nock('https://graph.facebook.com')
      .get(`/v25.0/${MEDIA_ID}`)
      .reply(401);

    await expect(downloader.download(MEDIA_ID)).rejects.toThrow('Meta API error 401');
  });

  it('throws when the audio download fails', async () => {
    nock('https://graph.facebook.com')
      .get(`/v25.0/${MEDIA_ID}`)
      .reply(200, { url: AUDIO_URL });

    nock('https://cdn.whatsapp.example.com')
      .get('/audio/file.ogg')
      .reply(503);

    await expect(downloader.download(MEDIA_ID)).rejects.toThrow('Meta API error 503');
  });
});
