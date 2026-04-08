import { loadRun } from '../storage';
import type { Score } from '../judge';
import type { ScenarioResult } from '../reporter';

export interface CompareOptions {
  labelA: string;
  labelB: string;
  runsDir: string;
}

function topicScore(score: Score): number | undefined {
  return score.topicCoherence ?? score.topicDiscovery;
}

function delta(a: number, b: number): string {
  if (b > a) return `${a}→${b}↑`;
  if (b < a) return `${a}→${b}↓`;
  return `${a}→${b}=`;
}

function topicDelta(a: Score, b: Score): string {
  const va = topicScore(a);
  const vb = topicScore(b);
  if (va === undefined || vb === undefined) return '?';
  return delta(va, vb);
}

function avg(results: ScenarioResult[], key: keyof Score): string {
  const values = results.map((r) => r.score[key] as number);
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}

function avgTopic(results: ScenarioResult[]): string {
  const values = results.map((r) => topicScore(r.score)).filter((v): v is number => v !== undefined);
  if (values.length === 0) return '--';
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}

export function compareRuns(options: CompareOptions): string {
  const { labelA, labelB, runsDir } = options;
  const runA = loadRun(labelA, runsDir);
  const runB = loadRun(labelB, runsDir);

  const byIdB = new Map(runB.results.map((r) => [r.scenario.id, r]));

  const col = (s: string, w: number) => s.padEnd(w);
  const divider = '─'.repeat(72);

  const metaLine = (label: string, model: string, note: string | undefined, date: string) => {
    const d = new Date(date).toISOString().slice(0, 10);
    const n = note ? `  "${note}"` : '';
    return `  ${label.padEnd(16)} ${model}${n}  (${d})`;
  };

  const header = [
    col('Scenario', 32),
    col('engage', 10),
    col('teach', 10),
    col('topic', 10),
    col('q_nat', 8),
  ].join('');

  const rows = runA.results
    .filter((rA) => byIdB.has(rA.scenario.id))
    .map((rA) => {
      const rB = byIdB.get(rA.scenario.id)!;
      const a = rA.score;
      const b = rB.score;
      return [
        col(rA.scenario.id, 32),
        col(delta(a.engagement, b.engagement), 10),
        col(delta(a.teachingQuality, b.teachingQuality), 10),
        col(topicDelta(a, b), 10),
        col(delta(a.questionNaturalness, b.questionNaturalness), 8),
      ].join('');
    });

  const avgRow = [
    col('Average', 32),
    col(`${avg(runA.results, 'engagement')}→${avg(runB.results, 'engagement')}`, 10),
    col(`${avg(runA.results, 'teachingQuality')}→${avg(runB.results, 'teachingQuality')}`, 10),
    col(`${avgTopic(runA.results)}→${avgTopic(runB.results)}`, 10),
    col(`${avg(runA.results, 'questionNaturalness')}→${avg(runB.results, 'questionNaturalness')}`, 8),
  ].join('');

  return [
    `Comparing: ${labelA} → ${labelB}`,
    metaLine(labelA, runA.judgeModel, runA.note, runA.createdAt),
    metaLine(labelB, runB.judgeModel, runB.note, runB.createdAt),
    divider,
    header,
    divider,
    ...rows,
    divider,
    avgRow,
  ].join('\n');
}
