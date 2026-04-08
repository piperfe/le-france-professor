import { formatReport } from './reporter';
import type { ScenarioResult } from './reporter';

const makeResult = (id: string, overrides: Partial<ScenarioResult['score']> = {}, evalMode: 'coherence' | 'discovery' = 'coherence'): ScenarioResult => ({
  scenario: {
    id,
    description: 'Test scenario',
    level: 'A2',
    interest: 'food',
    evalMode,
    studentTurns: ["j'aime manger."],
  },
  transcript: {
    scenarioId: id,
    level: 'A2',
    interest: 'food',
    evalMode,
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

  it('labels the topic dimension as coherence for coherence scenarios', () => {
    const report = formatReport([makeResult('test')]);
    expect(report).toContain('topic_coherence');
    expect(report).not.toContain('topic_discovery');
  });

  it('labels the topic dimension as discovery for discovery scenarios', () => {
    const result = makeResult(
      'test',
      { topicDiscovery: 2, topicCoherence: undefined },
      'discovery',
    );
    const report = formatReport([result]);
    expect(report).toContain('topic_discovery');
    expect(report).not.toContain('topic_coherence');
  });

  it('includes the rationale', () => {
    const report = formatReport([makeResult('test')]);
    expect(report).toContain('Good topic but forced questions.');
  });

  it('summary shows separate Avg coherence and Avg discovery rows with correct scores', () => {
    const results = [
      makeResult('scenario-a', { engagement: 2, teachingQuality: 2, topicCoherence: 2, questionNaturalness: 2 }, 'coherence'),
      makeResult('scenario-b', { engagement: 4, teachingQuality: 4, topicDiscovery: 4, topicCoherence: undefined, questionNaturalness: 4 }, 'discovery'),
    ];

    const report = formatReport(results);
    expect(report).toContain('SUMMARY');
    expect(report).toContain('Avg coherence');
    expect(report).toContain('Avg discovery');
    // coherence avg: engagement 2.0, topic_coherence 2.0
    // discovery avg: engagement 4.0, topic_discovery 4.0
    const lines = report.split('\n');
    const cohLine = lines.find((l) => l.startsWith('Avg coherence'))!;
    const disLine = lines.find((l) => l.startsWith('Avg discovery'))!;
    expect(cohLine).toContain('2.0');
    expect(disLine).toContain('4.0');
  });

  it('renders bar correctly — score 3 shows 3 filled and 2 empty blocks', () => {
    const report = formatReport([makeResult('test', { engagement: 3 })]);
    expect(report).toContain('███░░');
  });

  it('shows (C) for coherence and (D) for discovery in summary topic column', () => {
    const results = [
      makeResult('a', {}, 'coherence'),
      makeResult('b', { topicDiscovery: 3, topicCoherence: undefined }, 'discovery'),
    ];
    const report = formatReport(results);
    expect(report).toContain('(C)');
    expect(report).toContain('(D)');
  });
});
