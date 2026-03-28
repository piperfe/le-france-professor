import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { saveRun, loadRun, listRuns } from './storage';
import type { RunMeta } from './storage';
import type { ScenarioResult } from './reporter';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'evals-storage-test-'));
}

const FAKE_META: RunMeta = {
  label: 'baseline',
  createdAt: '2026-03-28T10:00:00.000Z',
  judgeModel: 'gemma3:4b',
  judgeUrl: 'http://localhost:11434',
  backendUrl: 'http://localhost:3001',
};

const FAKE_RESULT: ScenarioResult = {
  scenario: {
    id: 'a1-test',
    description: 'Test scenario',
    level: 'A1',
    interest: 'food',
    studentTurns: ['Bonjour'],
  },
  transcript: {
    scenarioId: 'a1-test',
    level: 'A1',
    interest: 'food',
    turns: [{ student: 'Bonjour', tutor: 'Bonjour ! Comment tu vas ?' }],
  },
  score: {
    engagement: 4,
    teachingQuality: 3,
    topicCoherence: 5,
    questionNaturalness: 4,
    rationale: 'Good engagement.',
  },
};

describe('saveRun / loadRun', () => {
  it('round-trips a run record', () => {
    const dir = tempDir();
    saveRun(FAKE_META, [FAKE_RESULT], dir);
    const record = loadRun('baseline', dir);
    expect(record.label).toBe('baseline');
    expect(record.judgeModel).toBe('gemma3:4b');
    expect(record.results).toHaveLength(1);
    expect(record.results[0].scenario.id).toBe('a1-test');
    rmSync(dir, { recursive: true });
  });

  it('stores the optional note', () => {
    const dir = tempDir();
    saveRun({ ...FAKE_META, note: 'default prompt before phase work' }, [FAKE_RESULT], dir);
    const record = loadRun('baseline', dir);
    expect(record.note).toBe('default prompt before phase work');
    rmSync(dir, { recursive: true });
  });

  it('omits note field when not provided', () => {
    const dir = tempDir();
    saveRun(FAKE_META, [FAKE_RESULT], dir);
    const record = loadRun('baseline', dir);
    expect(record.note).toBeUndefined();
    rmSync(dir, { recursive: true });
  });

  it('creates the runs dir if it does not exist', () => {
    const dir = join(tmpdir(), `evals-missing-${Date.now()}`);
    saveRun(FAKE_META, [FAKE_RESULT], dir);
    const record = loadRun('baseline', dir);
    expect(record.label).toBe('baseline');
    rmSync(dir, { recursive: true });
  });

  it('throws a descriptive error when label not found', () => {
    const dir = tempDir();
    expect(() => loadRun('ghost', dir)).toThrow('Run "ghost" not found');
    rmSync(dir, { recursive: true });
  });
});

describe('listRuns', () => {
  it('returns saved labels sorted alphabetically', () => {
    const dir = tempDir();
    saveRun({ ...FAKE_META, label: 'phase-v1' }, [FAKE_RESULT], dir);
    saveRun({ ...FAKE_META, label: 'baseline' }, [FAKE_RESULT], dir);
    expect(listRuns(dir)).toEqual(['baseline', 'phase-v1']);
    rmSync(dir, { recursive: true });
  });

  it('returns empty array when dir does not exist', () => {
    expect(listRuns('/tmp/does-not-exist-ever')).toEqual([]);
  });

  it('ignores non-json files', () => {
    const dir = tempDir();
    saveRun(FAKE_META, [FAKE_RESULT], dir);
    writeFileSync(join(dir, 'notes.txt'), 'ignore me');
    expect(listRuns(dir)).toEqual(['baseline']);
    rmSync(dir, { recursive: true });
  });
});
