import { join } from 'path';
import { Command } from 'commander';
import ora from 'ora';
import { runCommand } from './commands/run';
import type { ProgressEvent } from './commands/run';
import type { Score } from './judge';

const SCENARIOS_DIR = join(__dirname, '..', 'scenarios');
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';
const JUDGE_URL = process.env.JUDGE_URL ?? 'http://localhost:11434';
const JUDGE_MODEL = process.env.JUDGE_MODEL ?? 'gemma3:4b';

function scoreLabel(score: Score): string {
  return (
    `engage:${score.engagement} ` +
    `teach:${score.teachingQuality} ` +
    `cohere:${score.topicCoherence} ` +
    `q_nat:${score.questionNaturalness}`
  );
}

function makeProgressHandler(spinner: ReturnType<typeof ora>) {
  return (event: ProgressEvent) => {
    if (event.type === 'scenario_start') {
      spinner.start(`[${event.level}] ${event.scenarioId}`);
    } else if (event.type === 'scenario_done') {
      spinner.succeed(`${spinner.text}  →  ${scoreLabel(event.score)}`);
    } else if (event.type === 'scenario_error') {
      spinner.fail(`${spinner.text}  →  ERROR: ${event.error.message}`);
    }
  };
}

const program = new Command();

program
  .name('evals')
  .description('Automated conversation evaluation harness for Le France Professor')
  .version('1.0.0');

program
  .command('run')
  .description('Run all scenarios through the tutor and score them with the LLM judge')
  .option('--backend <url>', 'Backend URL', BACKEND_URL)
  .option('--judge-url <url>', 'Judge LLM URL (can differ from tutor)', JUDGE_URL)
  .option('--judge-model <name>', 'Judge LLM model name', JUDGE_MODEL)
  .action(async (opts: { backend: string; judgeUrl: string; judgeModel: string }) => {
    console.log(`\nEval harness — Le France Professor`);
    console.log(`  Backend     : ${opts.backend}`);
    console.log(`  Judge model : ${opts.judgeUrl} (${opts.judgeModel})\n`);

    const spinner = ora({ spinner: 'dots' });

    try {
      const report = await runCommand({
        backendUrl: opts.backend,
        judgeUrl: opts.judgeUrl,
        judgeModel: opts.judgeModel,
        scenariosDir: SCENARIOS_DIR,
        onProgress: makeProgressHandler(spinner),
      });

      console.log('\n' + report);
    } catch (err) {
      spinner.stop();
      console.error('\n' + (err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

program.parse();
