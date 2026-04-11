import nock from 'nock';
import request from 'supertest';
import express from 'express';
import { createApp } from '../../../index';
import { chatCompletionsMock, setIntegrationLlmEnv } from '../../http/integration/llmMock';

const VERIFY_TOKEN = 'test-verify-token';
const PHONE_NUMBER_ID = 'test-phone-id';

function setWhatsAppEnv(): void {
  process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN;
  process.env.WHATSAPP_ACCESS_TOKEN = 'test-access-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = PHONE_NUMBER_ID;
}

function metaApiMock() {
  return nock('https://graph.facebook.com')
    .post(`/v25.0/${PHONE_NUMBER_ID}/messages`)
    .reply(200, { messaging_product: 'whatsapp' });
}

function metaPayload(from: string, body: string) {
  return {
    entry: [{ changes: [{ value: { messages: [{ from, type: 'text', text: { body } }] } }] }],
  };
}

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 50));

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
      .send(metaPayload('+56967022669', 'Salut'));

    expect(res.status).toBe(200);
    await flushAsync();
    expect(meta.isDone()).toBe(true);
  });

  it('POST /api/webhook/whatsapp — existing phone sends message and delivers tutor response', async () => {
    chatCompletionsMock('Bonjour !');
    metaApiMock();
    await request(app).post('/api/webhook/whatsapp').send(metaPayload('+15551111111', 'Salut'));
    await flushAsync();

    chatCompletionsMock('Très bien ! Qu\'est-ce que tu veux apprendre ?');
    const meta = metaApiMock();

    const res = await request(app)
      .post('/api/webhook/whatsapp')
      .send(metaPayload('+15551111111', 'Ça va bien !'));

    expect(res.status).toBe(200);
    await flushAsync();
    expect(meta.isDone()).toBe(true);
  });
});
