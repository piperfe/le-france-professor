import { join } from 'path';
import { Command } from 'commander';
import ora from 'ora';
import { runCommand } from './commands/run';
import { compareRuns } from './commands/compare';
import type { ProgressEvent } from './commands/run';
import type { Score } from './judge';

const SCENARIOS_DIR = join(__dirname, '..', 'scenarios');
const RUNS_DIR = join(__dirname, '..', 'runs');
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';
const JUDGE_URL = process.env.JUDGE_URL ?? 'http://localhost:11434';
const JUDGE_MODEL = process.env.JUDGE_MODEL ?? 'gemma3:4b';
const DEFAULT_LABEL = `run-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}`;

function scoreLabel(score: Score): string {
  const topicValue = score.topicCoherence ?? score.topicDiscovery;
  const topicKey = score.topicDiscovery !== undefined ? 'disc' : 'coh';
  return (
    `engage:${score.engagement} ` +
    `teach:${score.teachingQuality} ` +
    `${topicKey}:${topicValue} ` +
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
  .option('--backend <url>',   'Backend URL',              BACKEND_URL)
  .option('--judge-url <url>', 'Judge LLM URL',            JUDGE_URL)
  .option('--judge-model <n>', 'Judge LLM model name',     JUDGE_MODEL)
  .option('--label <name>',    'Label for this run',       DEFAULT_LABEL)
  .option('--runs-dir <path>', 'Directory for saved runs', RUNS_DIR)
  .option('--note <text>',     'Free-text annotation for this run')
  .action(async (opts: {
    backend: string;
    judgeUrl: string;
    judgeModel: string;
    label: string;
    runsDir: string;
    note?: string;
  }) => {
    console.log(`\nEval harness — Le France Professor`);
    console.log(`  Backend     : ${opts.backend}`);
    console.log(`  Judge model : ${opts.judgeUrl} (${opts.judgeModel})`);
    console.log(`  Label       : ${opts.label}`);
    if (opts.note) console.log(`  Note        : ${opts.note}`);
    console.log();

    const spinner = ora({ spinner: 'dots' });

    try {
      const report = await runCommand({
        backendUrl: opts.backend,
        judgeUrl: opts.judgeUrl,
        judgeModel: opts.judgeModel,
        scenariosDir: SCENARIOS_DIR,
        label: opts.label,
        runsDir: opts.runsDir,
        note: opts.note,
        onProgress: makeProgressHandler(spinner),
      });

      console.log('\n' + report);
      console.log(`\nSaved → ${opts.runsDir}/${opts.label}.json`);
    } catch (err) {
      spinner.stop();
      console.error('\n' + (err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

program
  .command('compare <label-a> <label-b>')
  .description('Compare scores between two saved runs')
  .option('--runs-dir <path>', 'Directory for saved runs', RUNS_DIR)
  .action((labelA: string, labelB: string, opts: { runsDir: string }) => {
    try {
      console.log('\n' + compareRuns({ labelA, labelB, runsDir: opts.runsDir }));
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program.parse();
