import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { showRun } from './show';
import { saveRun } from '../storage';
import type { RunMeta } from '../storage';
import type { ScenarioResult } from '../reporter';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'evals-show-test-'));
}

const META: RunMeta = {
  label: 'calibration-flow-v2',
  createdAt: '2026-04-08T23:02:07.000Z',
  judgeModel: 'gemma3:4b',
  judgeUrl: 'http://localhost:11434',
  backendUrl: 'http://localhost:3001',
  note: 'corrected judge: eval_mode branching',
};

const COHERENCE_RESULT: ScenarioResult = {
  scenario: { id: 'a1-food', description: 'Test', level: 'A1', interest: 'food', evalMode: 'coherence', studentTurns: ["j'aime manger."] },
  transcript: { scenarioId: 'a1-food', level: 'A1', interest: 'food', evalMode: 'coherence', turns: [{ student: "j'aime manger.", tutor: 'Super !' }] },
  score: { engagement: 4, teachingQuality: 3, topicCoherence: 5, questionNaturalness: 4, rationale: 'Good.' },
};

const DISCOVERY_RESULT: ScenarioResult = {
  scenario: { id: 'a2-one-word', description: 'Test', level: 'A2', interest: 'unknown', evalMode: 'discovery', studentTurns: ['oui.'] },
  transcript: { scenarioId: 'a2-one-word', level: 'A2', interest: 'unknown', evalMode: 'discovery', turns: [{ student: 'oui.', tutor: 'Tu aimes quoi ?' }] },
  score: { engagement: 2, teachingQuality: 2, topicDiscovery: 1, questionNaturalness: 2, rationale: 'Tutor gave up.' },
};

describe('showRun', () => {
  it('includes the run label, judge model, note, and date in the header', () => {
    const dir = tempDir();
    saveRun(META, [COHERENCE_RESULT], dir);

    const output = showRun({ label: 'calibration-flow-v2', runsDir: dir });

    expect(output).toContain('calibration-flow-v2');
    expect(output).toContain('gemma3:4b');
    expect(output).toContain('corrected judge: eval_mode branching');
    expect(output).toContain('2026-04-08');
    rmSync(dir, { recursive: true });
  });

  it('omits the note section when no note was saved', () => {
    const dir = tempDir();
    const { note: _note, ...metaWithoutNote } = META;
    saveRun(metaWithoutNote, [COHERENCE_RESULT], dir);

    const output = showRun({ label: 'calibration-flow-v2', runsDir: dir });
    const headerLine = output.split('\n')[0];

    expect(headerLine).not.toContain('corrected judge');
    expect(headerLine).toContain('gemma3:4b');
    rmSync(dir, { recursive: true });
  });

  it('includes conversation turns from the transcript', () => {
    const dir = tempDir();
    saveRun(META, [COHERENCE_RESULT], dir);

    const output = showRun({ label: 'calibration-flow-v2', runsDir: dir });

    expect(output).toContain("j'aime manger.");
    expect(output).toContain('Super !');
    rmSync(dir, { recursive: true });
  });

  it('labels the topic dimension as discovery for discovery scenarios', () => {
    const dir = tempDir();
    saveRun(META, [DISCOVERY_RESULT], dir);

    const output = showRun({ label: 'calibration-flow-v2', runsDir: dir });

    expect(output).toContain('topic_discovery');
    rmSync(dir, { recursive: true });
  });

  it('includes SUMMARY with both Avg coherence and Avg discovery rows', () => {
    const dir = tempDir();
    saveRun(META, [COHERENCE_RESULT, DISCOVERY_RESULT], dir);

    const output = showRun({ label: 'calibration-flow-v2', runsDir: dir });

    expect(output).toContain('Avg coherence');
    expect(output).toContain('Avg discovery');
    rmSync(dir, { recursive: true });
  });

  it('throws when the label does not exist', () => {
    const dir = tempDir();
    expect(() => showRun({ label: 'ghost', runsDir: dir })).toThrow('Run "ghost" not found');
    rmSync(dir, { recursive: true });
  });
});
