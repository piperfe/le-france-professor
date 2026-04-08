import nock from 'nock';
import { runScenario } from './runner';
import type { Scenario } from './runner';

const BACKEND_URL = 'http://localhost:3001';

const scenario: Scenario = {
  id: 'runner-integration-test',
  description: 'Minimal scenario used only by the integration test',
  level: 'A2',
  interest: 'food',
  evalMode: 'coherence',
  studentTurns: ["j'aime manger.", 'le fromage surtout.'],
};

beforeEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.restore();
});

describe('runScenario (integration)', () => {
  it('returns a transcript with one turn per student message', async () => {
    nock(BACKEND_URL)
      .post('/api/conversations')
      .reply(201, { conversationId: 'conv-1', initialMessage: 'Salut !' });

    nock(BACKEND_URL)
      .post(/\/api\/conversations\/.+\/messages/)
      .reply(200, { tutorResponse: 'Ah super !', messageId: 'msg-1', message: "j'aime manger." });

    nock(BACKEND_URL)
      .post(/\/api\/conversations\/.+\/messages/)
      .reply(200, { tutorResponse: 'Miam, le fromage !', messageId: 'msg-2', message: 'le fromage surtout.' });

    const transcript = await runScenario(scenario, BACKEND_URL);

    expect(transcript.scenarioId).toBe(scenario.id);
    expect(transcript.level).toBe('A2');
    expect(transcript.interest).toBe('food');
    expect(transcript.turns).toHaveLength(2);
    expect(transcript.turns[0]).toEqual({ student: "j'aime manger.", tutor: 'Ah super !' });
    expect(transcript.turns[1]).toEqual({ student: 'le fromage surtout.', tutor: 'Miam, le fromage !' });
  });

  it('preserves student turn order in the transcript', async () => {
    nock(BACKEND_URL)
      .post('/api/conversations')
      .reply(201, { conversationId: 'conv-1', initialMessage: 'Salut !' });

    for (const turn of scenario.studentTurns) {
      nock(BACKEND_URL)
        .post(/\/api\/conversations\/.+\/messages/)
        .reply(200, { tutorResponse: 'Réponse !', messageId: 'msg-x', message: turn });
    }

    const transcript = await runScenario(scenario, BACKEND_URL);

    expect(transcript.turns[0].student).toBe(scenario.studentTurns[0]);
    expect(transcript.turns[1].student).toBe(scenario.studentTurns[1]);
  });

  it('throws when backend fails to create the conversation', async () => {
    nock(BACKEND_URL)
      .post('/api/conversations')
      .reply(503, { error: 'Service unavailable' });

    await expect(runScenario(scenario, BACKEND_URL)).rejects.toThrow('503');
  });

  it('throws when backend fails to send a message', async () => {
    nock(BACKEND_URL)
      .post('/api/conversations')
      .reply(201, { conversationId: 'conv-1', initialMessage: 'Salut !' });

    nock(BACKEND_URL)
      .post(/\/api\/conversations\/.+\/messages/)
      .reply(404, { error: 'Not found' });

    await expect(runScenario(scenario, BACKEND_URL)).rejects.toThrow('404');
  });
});
