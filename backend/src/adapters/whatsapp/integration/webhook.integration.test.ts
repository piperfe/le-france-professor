import nock from 'nock';
import request from 'supertest';
import express from 'express';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createApp } from '../../../index';
import { chatCompletionsMock, setIntegrationLlmEnv } from '../../http/integration/llmMock';

const VERIFY_TOKEN = 'test-verify-token';
const PHONE_NUMBER_ID = 'test-phone-id';
const WHISPER_URL = 'http://127.0.0.1:7600';

function setWhatsAppEnv(): void {
  process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN;
  process.env.WHATSAPP_ACCESS_TOKEN = 'test-access-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = PHONE_NUMBER_ID;
  process.env.WHISPER_URL = WHISPER_URL;
}

function metaApiMock() {
  return nock('https://graph.facebook.com')
    .post(`/v25.0/${PHONE_NUMBER_ID}/messages`)
    .reply(200, { messaging_product: 'whatsapp' });
}

function textPayload(from: string, body: string) {
  return {
    entry: [{ changes: [{ value: { messages: [{ from, type: 'text', text: { body } }] } }] }],
  };
}

function audioPayload(from: string, mediaId: string) {
  return {
    entry: [{ changes: [{ value: { messages: [{ from, type: 'audio', audio: { id: mediaId } }] } }] }],
  };
}

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 50));
const flushAsyncSlow = () => new Promise((resolve) => setTimeout(resolve, 3000));

describe('WhatsApp webhook (integration)', () => {
  let app: express.Application;

  beforeAll(() => {
    setIntegrationLlmEnv();
    setWhatsAppEnv();
    app = createApp();
  });

  beforeEach(() => {
    nock.cleanAll();
  });

  it('GET /api/webhook/whatsapp — responds with challenge when token matches', async () => {
    const res = await request(app)
      .get('/api/webhook/whatsapp')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': VERIFY_TOKEN, 'hub.challenge': 'xyz789' });

    expect(res.status).toBe(200);
    expect(res.text).toBe('xyz789');
  });

  it('POST /api/webhook/whatsapp — new phone creates conversation and sends initial greeting', async () => {
    chatCompletionsMock('Bonjour ! Je suis Sophie, ta tutrice de français.');
    const meta = metaApiMock();

    const res = await request(app)
      .post('/api/webhook/whatsapp')
      .send(textPayload('+56967022669', 'Salut'));

    expect(res.status).toBe(200);
    await flushAsync();
    expect(meta.isDone()).toBe(true);
  });

  it('POST /api/webhook/whatsapp — existing phone sends message and delivers tutor response', async () => {
    chatCompletionsMock('Bonjour !');
    metaApiMock();
    await request(app).post('/api/webhook/whatsapp').send(textPayload('+15551111111', 'Salut'));
    await flushAsync();

    chatCompletionsMock('Très bien ! Qu\'est-ce que tu veux apprendre ?');
    const meta = metaApiMock();

    const res = await request(app)
      .post('/api/webhook/whatsapp')
      .send(textPayload('+15551111111', 'Ça va bien !'));

    expect(res.status).toBe(200);
    await flushAsync();
    expect(meta.isDone()).toBe(true);
  });

  it('POST /api/webhook/whatsapp — voice note is transcribed and tutor replies', async () => {
    const mediaId = 'media-id-voice-123';
    const audioDownloadUrl = 'https://cdn.whatsapp.example.com/voice/file.ogg';
    // Real OGG fixture so ffmpeg can convert it to WAV during the pipeline
    const audioBytes = await readFile(join(process.cwd(), 'src/test/fixtures/silence.ogg'));

    // 1. Meta media URL lookup
    nock('https://graph.facebook.com')
      .get(`/v25.0/${mediaId}`)
      .reply(200, { url: audioDownloadUrl });

    // 2. Audio binary download — returns real OGG so convertOggToWav succeeds
    nock('https://cdn.whatsapp.example.com')
      .get('/voice/file.ogg')
      .reply(200, audioBytes);

    // 3. whisper.cpp transcription
    nock(WHISPER_URL)
      .post('/inference')
      .reply(200, { text: 'Je voudrais parler de musique.' });

    // 4. LLM response — new phone receives greeting only; the transcribed text is dropped.
    // TODO: fix tracked in Notion — [WhatsApp] First-contact voice note is silently dropped
    chatCompletionsMock('Super ! La musique française est magnifique.');
    const meta = metaApiMock();

    const res = await request(app)
      .post('/api/webhook/whatsapp')
      .send(audioPayload('+15552222222', mediaId));

    expect(res.status).toBe(200);
    // Allow extra time for real ffmpeg OGG→WAV conversion in the pipeline
    await flushAsyncSlow();
    expect(meta.isDone()).toBe(true);
  });
});
