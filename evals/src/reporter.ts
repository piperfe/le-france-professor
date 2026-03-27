import type { Score } from './judge';
import type { Scenario, Transcript } from './runner';

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

function formatScores(score: Score): string {
  const rows = [
    ['engagement',         score.engagement],
    ['teaching_quality',   score.teachingQuality],
    ['topic_coherence',    score.topicCoherence],
    ['q_naturalness',      score.questionNaturalness],
  ] as const;

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

function formatSummary(results: ScenarioResult[]): string {
  const divider = '─'.repeat(70);
  const col = (s: string | number, w: number) => String(s).padEnd(w);

  const header = [
    col('Scenario', 36),
    col('engage', 8),
    col('teach', 7),
    col('cohere', 8),
    col('q_nat', 5),
  ].join('');

  const rows = results.map((r) => {
    const s = r.score;
    return [
      col(r.scenario.id, 36),
      col(s.engagement, 8),
      col(s.teachingQuality, 7),
      col(s.topicCoherence, 8),
      col(s.questionNaturalness, 5),
    ].join('');
  });

  const avg = (key: keyof Score) => {
    const values = results.map((r) => r.score[key] as number);
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  };

  const averageRow = [
    col('Average', 36),
    col(avg('engagement'), 8),
    col(avg('teachingQuality'), 7),
    col(avg('topicCoherence'), 8),
    col(avg('questionNaturalness'), 5),
  ].join('');

  return ['SUMMARY', divider, header, divider, ...rows, divider, averageRow].join('\n');
}

export function formatReport(results: ScenarioResult[]): string {
  const scenarioSections = results.map(formatScenarioResult).join('\n');
  const summary = formatSummary(results);
  return [scenarioSections, summary].join('\n');
}
