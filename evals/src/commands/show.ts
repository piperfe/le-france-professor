import { loadRun } from '../storage';
import { formatReport } from '../reporter';

export interface ShowOptions {
  label: string;
  runsDir: string;
}

export function showRun(options: ShowOptions): string {
  const { label, runsDir } = options;
  const run = loadRun(label, runsDir);
  const date = new Date(run.createdAt).toISOString().slice(0, 10);
  const note = run.note ? `  "${run.note}"` : '';
  const header = `${label}  —  ${run.judgeModel}${note}  (${date})`;
  return [header, formatReport(run.results)].join('\n\n');
}
