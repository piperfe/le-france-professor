import nock from 'nock';
import request from 'supertest';
import express from 'express';
import { createApp } from '../../../index';
import { chatCompletionsMock } from '../../../test/integration/llm-mock';
import { testEnv } from '../../../test/integration/test-env';

describe('POST /api/conversations (integration)', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createApp(testEnv());
  });

  beforeEach(() => {
    nock.cleanAll();
  });

  it('returns 201 with conversationId and initialMessage', async () => {
    chatCompletionsMock('Bonjour ! Parlons de la culture française.');

    const res = await request(app)
      .post('/api/conversations')
      .expect(201);

    expect(res.body).toHaveProperty('conversationId');
    expect(res.body).toHaveProperty('initialMessage', 'Bonjour ! Parlons de la culture française.');
    expect(typeof res.body.conversationId).toBe('string');
    expect(res.body.conversationId.length).toBeGreaterThan(0);
  });
});
