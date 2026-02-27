import nock from 'nock';
import request from 'supertest';
import express from 'express';
import { createApp } from '../../../index';
import { chatCompletionsMock, setIntegrationLlmEnv } from './llmMock';

describe('GET /api/conversations/:conversationId (integration)', () => {
  let app: express.Application;

  beforeAll(() => {
    setIntegrationLlmEnv();
    app = createApp();
  });

  beforeEach(() => {
    nock.cleanAll();
  });

  it('returns 200 with conversation when it exists', async () => {
    chatCompletionsMock('Salut ! Comment allez-vous ?');
    const createRes = await request(app).post('/api/conversations').expect(201);
    const conversationId = createRes.body.conversationId;

    const getRes = await request(app)
      .get(`/api/conversations/${conversationId}`)
      .expect(200);

    expect(getRes.body).toHaveProperty('id', conversationId);
    expect(getRes.body).toHaveProperty('messages');
    expect(Array.isArray(getRes.body.messages)).toBe(true);
    expect(getRes.body.messages).toHaveLength(1);
    expect(getRes.body.messages[0]).toMatchObject({
      content: 'Salut ! Comment allez-vous ?',
      sender: 'tutor',
    });
  });
});
