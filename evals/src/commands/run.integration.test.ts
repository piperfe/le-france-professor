import nock from 'nock';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runCommand } from './run';

const SCENARIOS_DIR = join(__dirname, '..', '..', 'scenarios');
const BACKEND_URL = 'http://localhost:3001';
const JUDGE_URL = 'http://localhost:11434';
const JUDGE_MODEL = 'gemma3:4b';

let runsDir: string;

beforeEach(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'evals-run-test-'));
});

afterEach(() => {
  rmSync(runsDir, { recursive: true });
});

const FAKE_SCORE = {
  engagement: 4,
  teaching_quality: 3,
  topic_coherence: 5,
  question_naturalness: 2,
  rationale: 'Tutor kept the topic well but ended every turn with a question.',
};

function mockScenario(): void {
  nock(BACKEND_URL)
    .post('/api/conversations')
    .reply(201, { conversationId: 'conv-1', initialMessage: 'Salut !' });

  // 5 turns max per scenario
  nock(BACKEND_URL)
    .post(/\/api\/conversations\/.+\/messages/)
    .times(5)
    .reply(200, { tutorResponse: 'Ah super !', messageId: 'msg-1', message: 'test' });

  nock(JUDGE_URL)
    .post('/api/chat')
    .reply(200, { message: { content: JSON.stringify(FAKE_SCORE) } });
}

beforeEach(() => {
  nock.cleanAll();
  for (let i = 0; i < 5; i++) {
    mockScenario();
  }
});

afterAll(() => {
  nock.restore();
});

describe('runCommand (integration)', () => {
  it('runs all scenarios and returns a formatted report', async () => {
    const report = await runCommand({
      backendUrl: BACKEND_URL,
      judgeUrl: JUDGE_URL,
      judgeModel: JUDGE_MODEL,
      scenariosDir: SCENARIOS_DIR,
      label: 'test-run',
      runsDir,
    });

    expect(report).toContain('SUMMARY');
    expect(report).toContain('Average');
    expect(report).toContain('engagement');
  });

  it('includes scenario ids from the scenarios directory in the report', async () => {
    const report = await runCommand({
      backendUrl: BACKEND_URL,
      judgeUrl: JUDGE_URL,
      judgeModel: JUDGE_MODEL,
      scenariosDir: SCENARIOS_DIR,
      label: 'test-run',
      runsDir,
    });

    expect(report).toContain('a1-confused-beginner-food');
  });

  it('calls onProgress for each scenario start and done', async () => {
    const events: string[] = [];

    await runCommand({
      backendUrl: BACKEND_URL,
      judgeUrl: JUDGE_URL,
      judgeModel: JUDGE_MODEL,
      scenariosDir: SCENARIOS_DIR,
      label: 'test-run',
      runsDir,
      onProgress: (event) => events.push(event.type),
    });

    expect(events).toContain('scenario_start');
    expect(events).toContain('scenario_done');
  });

  it('emits scenario_error and continues when backend returns 500', async () => {
    nock.cleanAll();
    for (let i = 0; i < 5; i++) {
      nock(BACKEND_URL)
        .post('/api/conversations')
        .reply(500, { error: 'Internal server error' });
    }

    const errors: string[] = [];

    await runCommand({
      backendUrl: BACKEND_URL,
      judgeUrl: JUDGE_URL,
      judgeModel: JUDGE_MODEL,
      scenariosDir: SCENARIOS_DIR,
      label: 'test-run',
      runsDir,
      onProgress: (event) => {
        if (event.type === 'scenario_error') errors.push(event.scenarioId);
      },
    }).catch(() => {});

    expect(errors.length).toBeGreaterThan(0);
  });

  it('emits scenario_error when judge returns an out-of-range score', async () => {
    nock.cleanAll();
    const badScore = { ...FAKE_SCORE, engagement: 0 };

    for (let i = 0; i < 5; i++) {
      nock(BACKEND_URL)
        .post('/api/conversations')
        .reply(201, { conversationId: `conv-${i}`, initialMessage: 'Salut !' });

      nock(BACKEND_URL)
        .post(/\/api\/conversations\/.+\/messages/)
        .times(5)
        .reply(200, { tutorResponse: 'Ah super !', messageId: 'msg-1', message: 'test' });

      nock(JUDGE_URL)
        .post('/api/chat')
        .reply(200, { message: { content: JSON.stringify(badScore) } });
    }

    const errors: string[] = [];

    await runCommand({
      backendUrl: BACKEND_URL,
      judgeUrl: JUDGE_URL,
      judgeModel: JUDGE_MODEL,
      scenariosDir: SCENARIOS_DIR,
      label: 'test-run',
      runsDir,
      onProgress: (event) => {
        if (event.type === 'scenario_error') errors.push(event.scenarioId);
      },
    }).catch(() => {});

    expect(errors.length).toBeGreaterThan(0);
  });
});
