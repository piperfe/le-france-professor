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
});
