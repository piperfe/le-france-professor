import nock from 'nock';
import request from 'supertest';
import express from 'express';
import { createApp } from '../../../index';
import { chatCompletionsMock, setIntegrationLlmEnv } from './llmMock';

describe('GET /api/conversations (integration)', () => {
  let app: express.Application;

  beforeAll(() => {
    setIntegrationLlmEnv();
    app = createApp();
  });

  beforeEach(() => {
    nock.cleanAll();
  });

  it('returns 200 with empty list when no conversations exist', async () => {
    const res = await request(app).get('/api/conversations').expect(200);

    expect(res.body).toHaveProperty('conversations');
    expect(Array.isArray(res.body.conversations)).toBe(true);
  });

  it('returns all created conversations with id and title', async () => {
    chatCompletionsMock('Bonjour ! Comment puis-je vous aider ?');
    const createRes = await request(app).post('/api/conversations').expect(201);
    const conversationId = createRes.body.conversationId;

    const listRes = await request(app).get('/api/conversations').expect(200);

    const found = listRes.body.conversations.find((c: { id: string }) => c.id === conversationId);
    expect(found).toBeDefined();
    expect(found.title).toBe('Bonjour ! Comment puis-je vous aider ?');
    expect(found.createdAt).toBeDefined();
  });

  it('truncates title to 40 chars with ellipsis for long opening messages', async () => {
    chatCompletionsMock('Bonjour ! Je suis ravi de vous rencontrer et de commencer cette leçon de français.');
    const createRes = await request(app).post('/api/conversations').expect(201);
    const conversationId = createRes.body.conversationId;

    const listRes = await request(app).get('/api/conversations').expect(200);

    const found = listRes.body.conversations.find((c: { id: string }) => c.id === conversationId);
    expect(found.title).toHaveLength(41); // 40 chars + '…'
    expect(found.title.endsWith('…')).toBe(true);
  });
});
