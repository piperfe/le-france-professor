import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { compareRuns } from './compare';
import { saveRun } from '../storage';
import type { RunMeta } from '../storage';
import type { ScenarioResult } from '../reporter';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'evals-compare-test-'));
}

function makeResult(id: string, scores: Partial<ScenarioResult['score']> = {}): ScenarioResult {
  return {
    scenario: { id, description: 'Test', level: 'A2', interest: 'food', studentTurns: ['Bonjour'] },
    transcript: { scenarioId: id, level: 'A2', interest: 'food', turns: [] },
    score: {
      engagement: 3,
      teachingQuality: 3,
      topicCoherence: 3,
      questionNaturalness: 3,
      rationale: 'Average.',
      ...scores,
    },
  };
}

const BASE_META: RunMeta = {
  label: 'baseline',
  createdAt: '2026-03-28T10:00:00.000Z',
  judgeModel: 'gemma3:4b',
  judgeUrl: 'http://localhost:11434',
  backendUrl: 'http://localhost:3001',
};

describe('compareRuns', () => {
  it('shows arrow indicators for improved scores', () => {
    const dir = tempDir();
    saveRun(BASE_META, [makeResult('a1-test', { engagement: 2 })], dir);
    saveRun({ ...BASE_META, label: 'phase-v1' }, [makeResult('a1-test', { engagement: 4 })], dir);

    const output = compareRuns({ labelA: 'baseline', labelB: 'phase-v1', runsDir: dir });
    expect(output).toContain('2→4↑');
    rmSync(dir, { recursive: true });
  });

  it('shows ↓ for regressed scores', () => {
    const dir = tempDir();
    saveRun(BASE_META, [makeResult('a1-test', { teachingQuality: 4 })], dir);
    saveRun({ ...BASE_META, label: 'phase-v1' }, [makeResult('a1-test', { teachingQuality: 2 })], dir);

    const output = compareRuns({ labelA: 'baseline', labelB: 'phase-v1', runsDir: dir });
    expect(output).toContain('4→2↓');
    rmSync(dir, { recursive: true });
  });

  it('shows = for unchanged scores', () => {
    const dir = tempDir();
    saveRun(BASE_META, [makeResult('a1-test', { topicCoherence: 3 })], dir);
    saveRun({ ...BASE_META, label: 'phase-v1' }, [makeResult('a1-test', { topicCoherence: 3 })], dir);

    const output = compareRuns({ labelA: 'baseline', labelB: 'phase-v1', runsDir: dir });
    expect(output).toContain('3→3=');
    rmSync(dir, { recursive: true });
  });

  it('includes metadata lines with judge model and date', () => {
    const dir = tempDir();
    saveRun(BASE_META, [makeResult('a1-test')], dir);
    saveRun({ ...BASE_META, label: 'phase-v1' }, [makeResult('a1-test')], dir);

    const output = compareRuns({ labelA: 'baseline', labelB: 'phase-v1', runsDir: dir });
    expect(output).toContain('gemma3:4b');
    expect(output).toContain('2026-03-28');
    rmSync(dir, { recursive: true });
  });

  it('includes the note when provided', () => {
    const dir = tempDir();
    saveRun({ ...BASE_META, note: 'default prompt' }, [makeResult('a1-test')], dir);
    saveRun({ ...BASE_META, label: 'phase-v1', note: 'discovery phase added' }, [makeResult('a1-test')], dir);

    const output = compareRuns({ labelA: 'baseline', labelB: 'phase-v1', runsDir: dir });
    expect(output).toContain('default prompt');
    expect(output).toContain('discovery phase added');
    rmSync(dir, { recursive: true });
  });

  it('includes the average row', () => {
    const dir = tempDir();
    saveRun(BASE_META, [
      makeResult('a', { engagement: 2 }),
      makeResult('b', { engagement: 4 }),
    ], dir);
    saveRun({ ...BASE_META, label: 'phase-v1' }, [
      makeResult('a', { engagement: 3 }),
      makeResult('b', { engagement: 5 }),
    ], dir);

    const output = compareRuns({ labelA: 'baseline', labelB: 'phase-v1', runsDir: dir });
    expect(output).toContain('Average');
    // avg engagement: 3.0 → 4.0
    expect(output).toContain('3.0→4.0');
    rmSync(dir, { recursive: true });
  });

  it('skips scenarios present in A but missing in B', () => {
    const dir = tempDir();
    saveRun(BASE_META, [makeResult('a1-test'), makeResult('b1-extra')], dir);
    saveRun({ ...BASE_META, label: 'phase-v1' }, [makeResult('a1-test')], dir);

    const output = compareRuns({ labelA: 'baseline', labelB: 'phase-v1', runsDir: dir });
    expect(output).toContain('a1-test');
    expect(output).not.toContain('b1-extra');
    rmSync(dir, { recursive: true });
  });

  it('throws when a label does not exist', () => {
    const dir = tempDir();
    expect(() =>
      compareRuns({ labelA: 'ghost', labelB: 'also-ghost', runsDir: dir }),
    ).toThrow('Run "ghost" not found');
    rmSync(dir, { recursive: true });
  });
});
