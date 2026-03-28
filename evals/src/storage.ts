import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { ScenarioResult } from './reporter';

export interface RunMeta {
  label: string;
  createdAt: string; // ISO-8601
  judgeModel: string;
  judgeUrl: string;
  backendUrl: string;
  note?: string;
}

export interface RunRecord extends RunMeta {
  results: ScenarioResult[];
}

export function saveRun(
  meta: RunMeta,
  results: ScenarioResult[],
  runsDir: string,
): void {
  mkdirSync(runsDir, { recursive: true });
  const record: RunRecord = { ...meta, results };
  writeFileSync(join(runsDir, `${meta.label}.json`), JSON.stringify(record, null, 2), 'utf-8');
}

export function loadRun(label: string, runsDir: string): RunRecord {
  try {
    return JSON.parse(readFileSync(join(runsDir, `${label}.json`), 'utf-8')) as RunRecord;
  } catch {
    throw new Error(`Run "${label}" not found in ${runsDir}`);
  }
}

export function listRuns(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort();
  } catch {
    return [];
  }
}
