import type { Score } from './judge';
import type { EvalMode, Scenario, Transcript } from './runner';

export interface ScenarioResult {
  scenario: Scenario;
  transcript: Transcript;
  score: Score;
}

const BAR_LENGTH = 5;

function bar(score: number): string {
  return '█'.repeat(score) + '░'.repeat(BAR_LENGTH - score);
}

function formatTranscript(transcript: Transcript): string {
  return transcript.turns
    .map((t) => `  Student: ${t.student}\n    Tutor: ${t.tutor}`)
    .join('\n\n');
}

function topicRow(score: Score): [string, number] {
  if (score.topicDiscovery !== undefined) return ['topic_discovery', score.topicDiscovery];
  return ['topic_coherence', score.topicCoherence!];
}

function formatScores(score: Score): string {
  const [topicLabel, topicValue] = topicRow(score);
  const rows: Array<[string, number]> = [
    ['engagement',       score.engagement],
    ['teaching_quality', score.teachingQuality],
    [topicLabel,         topicValue],
    ['q_naturalness',    score.questionNaturalness],
  ];

  const lines = rows.map(([label, value]) =>
    `  ${label.padEnd(18)} ${value}  ${bar(value)}`,
  );

  return lines.join('\n') + `\n\n  "${score.rationale}"`;
}

function formatScenarioResult(result: ScenarioResult): string {
  const { scenario, transcript, score } = result;
  const border = '═'.repeat(55);
  const header = `Scenario: ${scenario.id}  (${scenario.level} · ${scenario.interest})`;

  return [
    border,
    header,
    border,
    '',
    formatTranscript(transcript),
    '',
    formatScores(score),
    '',
  ].join('\n');
}

function topicScore(score: Score): number {
  return score.topicCoherence ?? score.topicDiscovery!;
}

function avgForMode(results: ScenarioResult[], mode: EvalMode): string {
  const subset = results.filter((r) => r.scenario.evalMode === mode);
  if (subset.length === 0) return '--';
  const values = subset.map((r) => topicScore(r.score));
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}

function avgKey(
  results: ScenarioResult[],
  key: Exclude<keyof Score, 'topicCoherence' | 'topicDiscovery' | 'rationale'>,
  mode?: EvalMode,
): string {
  const subset = mode ? results.filter((r) => r.scenario.evalMode === mode) : results;
  if (subset.length === 0) return '--';
  const values = subset.map((r) => r.score[key] as number);
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}

function formatSummary(results: ScenarioResult[]): string {
  const divider = '─'.repeat(74);
  const col = (s: string | number, w: number) => String(s).padEnd(w);

  const header = [
    col('Scenario', 36),
    col('engage', 8),
    col('teach', 7),
    col('topic', 10),
    col('q_nat', 5),
  ].join('');

  const rows = results.map((r) => {
    const s = r.score;
    const [topicLabel, topicValue] = topicRow(s);
    const topicCell = `${topicValue}(${topicLabel === 'topic_discovery' ? 'D' : 'C'})`;
    return [
      col(r.scenario.id, 36),
      col(s.engagement, 8),
      col(s.teachingQuality, 7),
      col(topicCell, 10),
      col(s.questionNaturalness, 5),
    ].join('');
  });

  const avgCoherence = [
    col('Avg coherence', 36),
    col(avgKey(results, 'engagement', 'coherence'), 8),
    col(avgKey(results, 'teachingQuality', 'coherence'), 7),
    col(avgForMode(results, 'coherence'), 10),
    col(avgKey(results, 'questionNaturalness', 'coherence'), 5),
  ].join('');

  const avgDiscovery = [
    col('Avg discovery', 36),
    col(avgKey(results, 'engagement', 'discovery'), 8),
    col(avgKey(results, 'teachingQuality', 'discovery'), 7),
    col(avgForMode(results, 'discovery'), 10),
    col(avgKey(results, 'questionNaturalness', 'discovery'), 5),
  ].join('');

  return ['SUMMARY', divider, header, divider, ...rows, divider, avgCoherence, avgDiscovery].join('\n');
}

export function formatReport(results: ScenarioResult[]): string {
  const scenarioSections = results.map(formatScenarioResult).join('\n');
  const summary = formatSummary(results);
  return [scenarioSections, summary].join('\n');
}
