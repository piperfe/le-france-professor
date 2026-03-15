import nock from 'nock';
import request from 'supertest';
import express from 'express';
import { createApp } from '../../../index';
import { chatCompletionsMock, setIntegrationLlmEnv } from './llmMock';

describe('POST /api/conversations/:conversationId/messages (integration)', () => {
  let app: express.Application;

  beforeAll(() => {
    setIntegrationLlmEnv();
    app = createApp();
  });

  beforeEach(() => {
    nock.cleanAll();
  });

  it('returns 200 with message and tutorResponse', async () => {
    chatCompletionsMock('Bienvenue ! De quoi voulez-vous parler ?');
    const createRes = await request(app).post('/api/conversations').expect(201);
    const conversationId = createRes.body.conversationId;

    chatCompletionsMock('Oui, je voudrais apprendre le français.');
    const msgRes = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .send({ message: 'Bonjour' })
      .expect(200);

    expect(msgRes.body).toHaveProperty('message', 'Bonjour');
    expect(msgRes.body).toHaveProperty('tutorResponse', 'Oui, je voudrais apprendre le français.');
  });

  it('generates and stores a title after the second user message', async () => {
    chatCompletionsMock('Salut !');
    const createRes = await request(app).post('/api/conversations').expect(201);
    const conversationId = createRes.body.conversationId;

    chatCompletionsMock('Bien, et toi ?');
    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .send({ message: 'Ça va ?' })
      .expect(200);

    // Second message: title generation fires after this one (3 LLM calls: tutor reply + title)
    chatCompletionsMock("C'est super que tu aimes la cuisine !");
    chatCompletionsMock('La cuisine française avec Sophie');
    await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .send({ message: "J'aime la cuisine française" })
      .expect(200);

    // Give the background title generation time to complete
    await new Promise((r) => setTimeout(r, 200));

    const convRes = await request(app)
      .get(`/api/conversations/${conversationId}`)
      .expect(200);

    expect(convRes.body.title).toBe('La cuisine française avec Sophie');
  });
});
