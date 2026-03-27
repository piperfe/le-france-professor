import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { runScenario } from '../runner';
import { scoreTranscript } from '../judge';
import { formatReport } from '../reporter';
import type { Score } from '../judge';
import type { ScenarioResult } from '../reporter';
import type { Scenario } from '../runner';

export interface RunOptions {
  backendUrl: string;
  judgeUrl: string;
  judgeModel: string;
  scenariosDir: string;
  onProgress?: (event: ProgressEvent) => void;
}

export type ProgressEvent =
  | { type: 'scenario_start'; scenarioId: string; level: string }
  | { type: 'scenario_done'; scenarioId: string; score: Score }
  | { type: 'scenario_error'; scenarioId: string; error: Error };

function loadScenarios(scenariosDir: string): Scenario[] {
  return readdirSync(scenariosDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(scenariosDir, f), 'utf-8')) as Scenario);
}

export async function runCommand(options: RunOptions): Promise<string> {
  const { backendUrl, judgeUrl, judgeModel, scenariosDir, onProgress } = options;
  const scenarios = loadScenarios(scenariosDir);
  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    onProgress?.({ type: 'scenario_start', scenarioId: scenario.id, level: scenario.level });

    try {
      const transcript = await runScenario(scenario, backendUrl);
      const score = await scoreTranscript(transcript, judgeUrl, judgeModel);
      results.push({ scenario, transcript, score });
      onProgress?.({ type: 'scenario_done', scenarioId: scenario.id, score });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onProgress?.({ type: 'scenario_error', scenarioId: scenario.id, error });
    }
  }

  if (results.length === 0) {
    throw new Error('No scenarios completed successfully — check backend and Ollama are running.');
  }

  return formatReport(results);
}
