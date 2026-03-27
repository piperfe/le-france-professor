# Le France Professor — Eval Harness

Automated conversation evaluation for the tutor. Runs pre-written student scenarios through the real backend, scores each conversation with an LLM judge, and prints a formatted report.

## Why a separate judge model?

The tutor uses `gemma3:4b` via the backend. The judge uses a **different model** (configurable via `JUDGE_URL` / `JUDGE_MODEL`). This prevents self-evaluation bias — a model scoring its own outputs inflates quality. It also makes the harness portable: you can point it at a remote judge (OpenAI, Anthropic, a hosted Ollama) without touching the backend.

## Architecture

Three layers, no hexagonal:

```
runner.ts        — scenario → transcript   (calls backend API, records tutor responses)
judge.ts         — transcript → score      (calls LLM judge, validates 1-5 range)
reporter.ts      — results → report        (bar charts + averages table)
commands/run.ts  — orchestrates + emits onProgress events
cli.ts           — commander entry point with ora spinner
```

Types are co-located with their owner: `Score` in `judge.ts`, `Scenario/Transcript` in `runner.ts`, `ScenarioResult` in `reporter.ts`.

## Scenarios

Static student personas in `scenarios/` — pre-written student turns that exercise known problem patterns:

| File | Level | Pattern |
|------|-------|---------|
| `a1-confused-beginner-food.json` | A1 | Hesitant, 1-2 word answers |
| `a2-shy-student-travel.json` | A2 | Mixes English — engagement cliff test |
| `a2-one-word-answers.json` | A2 | Minimal responses — hardest engagement scenario |
| `b1-engaged-student-sport.json` | B1 | Talkative with grammar mistakes |
| `b1-mixed-language-cinema.json` | B1 | Switches to Spanish when stuck |

The design is "Static seeds + LLM student" — student turns are fixed so results are reproducible across runs. LLM-generated student turns are a future option if you need broader coverage.

## Scoring dimensions

Each conversation is scored 1–5 on four axes:

- **engagement** — does the tutor keep the student wanting to continue?
- **teaching_quality** — natural vocab intro, recasts, teaching in context
- **topic_coherence** — does the tutor maintain a coherent topic thread?
- **question_naturalness** — varied and conversational, not a forced question every turn

## Running

Requires the Le France Professor backend and an Ollama instance to be running. URLs default to `http://localhost:3001` and `http://localhost:11434` but are fully configurable:

```bash
cd evals
npm install

# Run with defaults
npm run eval

# Override URLs and judge model
BACKEND_URL=http://localhost:3001 \
JUDGE_URL=http://localhost:11434 \
JUDGE_MODEL=gemma3:4b \
npm run eval
```

CLI flags work too and take precedence over env vars:

```bash
npx tsx src/cli.ts run \
  --backend http://localhost:3001 \
  --judge-url http://localhost:11434 \
  --judge-model gemma3:4b
```

## Tests

```bash
npm test          # unit tests only (judge + reporter)
npm run test:all  # unit + integration (nock intercepts HTTP — no live servers needed)
```

Integration tests use [nock](https://github.com/nock/nock) to intercept both the backend and the Ollama judge. HTTP calls use `node-fetch` v2 (nock only intercepts the Node.js `http` module, not native fetch / undici).
