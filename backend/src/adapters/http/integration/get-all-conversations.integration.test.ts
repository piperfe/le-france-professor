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

  it('returns fallback title before LLM title is generated', async () => {
    chatCompletionsMock('Salut !');
    const createRes = await request(app).post('/api/conversations').expect(201);
    const conversationId = createRes.body.conversationId;

    const listRes = await request(app).get('/api/conversations').expect(200);

    const found = listRes.body.conversations.find((c: { id: string }) => c.id === conversationId);
    expect(found).toBeDefined();
    expect(found.title).toMatch(/^Nouvelle conversation \d{2}\/\d{2} \d{2}:\d{2}$/);
    expect(found.createdAt).toBeDefined();
  });
});
