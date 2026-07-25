import request from 'supertest';
import express from 'express';
import { createApp } from '../../../index';
import { testEnv } from '../../../test/integration/test-env';

describe('GET /api/health (integration)', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createApp(testEnv());
  });

  it('returns 200 with status ok', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect(200);

    expect(res.body).toEqual({ status: 'ok' });
  });
});
