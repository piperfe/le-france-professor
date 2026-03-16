import nock from 'nock';
import request from 'supertest';
import express from 'express';
import { createApp } from '../../../index';
import { chatCompletionsMock, setIntegrationLlmEnv } from './llmMock';

describe('POST /api/conversations/:conversationId/vocabulary (integration)', () => {
  let app: express.Application;

  beforeAll(() => {
    setIntegrationLlmEnv();
    app = createApp();
  });

  beforeEach(() => {
    nock.cleanAll();
  });

  it('returns 200 with explanation', async () => {
    chatCompletionsMock('Bienvenue !');
    const createRes = await request(app).post('/api/conversations').expect(201);
    const conversationId = createRes.body.conversationId;

    chatCompletionsMock(
      "« Passée » est le participe passé féminin du verbe « se passer » (to happen). En anglais : \"how has your day gone\".",
    );
    const res = await request(app)
      .post(`/api/conversations/${conversationId}/vocabulary`)
      .send({ word: 'passée', context: "Comment s'est passée ta journée ?" })
      .expect(200);

    expect(res.body).toHaveProperty('explanation');
    expect(typeof res.body.explanation).toBe('string');
    expect(res.body.explanation.length).toBeGreaterThan(0);
  });

  it('works without context (standalone word lookup)', async () => {
    chatCompletionsMock('Bonjour !');
    const createRes = await request(app).post('/api/conversations').expect(201);
    const conversationId = createRes.body.conversationId;

    chatCompletionsMock('« Bonjour » est une salutation française. En anglais : "hello".');
    const res = await request(app)
      .post(`/api/conversations/${conversationId}/vocabulary`)
      .send({ word: 'bonjour' })
      .expect(200);

    expect(res.body).toHaveProperty('explanation');
  });

  it('returns 400 when word is missing', async () => {
    chatCompletionsMock('Bonjour !');
    const createRes = await request(app).post('/api/conversations').expect(201);
    const conversationId = createRes.body.conversationId;

    const res = await request(app)
      .post(`/api/conversations/${conversationId}/vocabulary`)
      .send({})
      .expect(400);

    expect(res.body).toHaveProperty('error', 'word is required');
  });

  it('does not add messages to conversation history', async () => {
    chatCompletionsMock('Bonjour !');
    const createRes = await request(app).post('/api/conversations').expect(201);
    const conversationId = createRes.body.conversationId;

    chatCompletionsMock('« Merci » signifie "thank you".');
    await request(app)
      .post(`/api/conversations/${conversationId}/vocabulary`)
      .send({ word: 'merci', context: 'Merci beaucoup !', sourceMessageId: 'msg-1' })
      .expect(200);

    const convRes = await request(app)
      .get(`/api/conversations/${conversationId}`)
      .expect(200);

    expect(convRes.body.messages).toHaveLength(1); // only the initial tutor message
  });

  it('saves entry — GET returns it after POST', async () => {
    chatCompletionsMock('Bonjour !');
    const createRes = await request(app).post('/api/conversations').expect(201);
    const conversationId = createRes.body.conversationId;

    chatCompletionsMock('« Merci » signifie "thank you". En anglais : "thank you".');
    await request(app)
      .post(`/api/conversations/${conversationId}/vocabulary`)
      .send({ word: 'merci', context: 'Merci beaucoup !', sourceMessageId: 'msg-initial' })
      .expect(200);

    const getRes = await request(app)
      .get(`/api/conversations/${conversationId}/vocabulary`)
      .expect(200);

    expect(getRes.body.vocabulary).toHaveLength(1);
    expect(getRes.body.vocabulary[0].word).toBe('merci');
    expect(getRes.body.vocabulary[0].sourceMessageId).toBe('msg-initial');
    expect(getRes.body.vocabulary[0]).toHaveProperty('explanation');
    expect(getRes.body.vocabulary[0]).toHaveProperty('id');
    expect(getRes.body.vocabulary[0]).toHaveProperty('createdAt');
  });

  it('GET returns empty array for conversation with no vocabulary', async () => {
    chatCompletionsMock('Bonjour !');
    const createRes = await request(app).post('/api/conversations').expect(201);
    const conversationId = createRes.body.conversationId;

    const getRes = await request(app)
      .get(`/api/conversations/${conversationId}/vocabulary`)
      .expect(200);

    expect(getRes.body.vocabulary).toEqual([]);
  });

  it('accumulates multiple entries in order', async () => {
    chatCompletionsMock('Bonjour !');
    const createRes = await request(app).post('/api/conversations').expect(201);
    const conversationId = createRes.body.conversationId;

    chatCompletionsMock('Explication de passée.');
    await request(app)
      .post(`/api/conversations/${conversationId}/vocabulary`)
      .send({ word: 'passée', context: 'Context.', sourceMessageId: 'msg-1' })
      .expect(200);

    chatCompletionsMock('Explication de merci.');
    await request(app)
      .post(`/api/conversations/${conversationId}/vocabulary`)
      .send({ word: 'merci', context: 'Context.', sourceMessageId: 'msg-2' })
      .expect(200);

    const getRes = await request(app)
      .get(`/api/conversations/${conversationId}/vocabulary`)
      .expect(200);

    expect(getRes.body.vocabulary).toHaveLength(2);
    expect(getRes.body.vocabulary[0].word).toBe('passée');
    expect(getRes.body.vocabulary[1].word).toBe('merci');
  });
});
