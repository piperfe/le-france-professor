import { formatReport } from './reporter';
import type { ScenarioResult } from './reporter';

const makeResult = (id: string, overrides: Partial<ScenarioResult['score']> = {}): ScenarioResult => ({
  scenario: {
    id,
    description: 'Test scenario',
    level: 'A2',
    interest: 'food',
    studentTurns: ["j'aime manger."],
  },
  transcript: {
    scenarioId: id,
    level: 'A2',
    interest: 'food',
    turns: [{ student: "j'aime manger.", tutor: 'Ah super, tu aimes quoi ?' }],
  },
  score: {
    engagement: 4,
    teachingQuality: 3,
    topicCoherence: 5,
    questionNaturalness: 2,
    rationale: 'Good topic but forced questions.',
    ...overrides,
  },
});

describe('formatReport', () => {
  it('includes the scenario id in the output', () => {
    const report = formatReport([makeResult('a2-food-test')]);
    expect(report).toContain('a2-food-test');
  });

  it('includes student and tutor turns', () => {
    const report = formatReport([makeResult('test')]);
    expect(report).toContain("j'aime manger.");
    expect(report).toContain('Ah super, tu aimes quoi ?');
  });

  it('includes all four score dimensions', () => {
    const report = formatReport([makeResult('test')]);
    expect(report).toContain('engagement');
    expect(report).toContain('teaching_quality');
    expect(report).toContain('topic_coherence');
    expect(report).toContain('q_naturalness');
  });

  it('includes the rationale', () => {
    const report = formatReport([makeResult('test')]);
    expect(report).toContain('Good topic but forced questions.');
  });

  it('includes SUMMARY section with average row', () => {
    const results = [
      makeResult('scenario-a', { engagement: 2, teachingQuality: 2, topicCoherence: 2, questionNaturalness: 2 }),
      makeResult('scenario-b', { engagement: 4, teachingQuality: 4, topicCoherence: 4, questionNaturalness: 4 }),
    ];

    const report = formatReport(results);
    expect(report).toContain('SUMMARY');
    expect(report).toContain('Average');
    // Average of 2 and 4 is 3.0
    expect(report).toContain('3.0');
  });

  it('renders bar correctly — score 3 shows 3 filled and 2 empty blocks', () => {
    const report = formatReport([makeResult('test', { engagement: 3 })]);
    expect(report).toContain('███░░');
  });
});
