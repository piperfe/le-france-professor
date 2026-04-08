# Le France Professor — Eval Harness

Automated conversation evaluation for the tutor. Runs pre-written student scenarios through the real backend, scores each conversation with an LLM judge, and prints a formatted report.

## Why a separate judge model?

The tutor uses `gemma3:4b` via the backend. The judge uses a **different model** (configurable via `JUDGE_URL` / `JUDGE_MODEL`). This prevents self-evaluation bias — a model scoring its own outputs inflates quality. It also makes the harness portable: you can point it at a remote judge (OpenAI, Anthropic, a hosted Ollama) without touching the backend.

## Architecture

Four layers, no hexagonal:

```
runner.ts          — scenario → transcript    (calls backend API, records tutor responses)
judge.ts           — transcript → score       (calls LLM judge, validates 1-5 range)
reporter.ts        — results → report         (bar charts + averages table)
storage.ts         — run → disk               (saves/loads JSON in runs/, lists labels)
commands/run.ts    — orchestrates + saves run + emits onProgress events
commands/compare.ts— loads two runs, diffs scores, prints arrow table
cli.ts             — commander entry point with ora spinner
```

Types are co-located with their owner: `Score` in `judge.ts`, `EvalMode/Scenario/Transcript` in `runner.ts`, `ScenarioResult` in `reporter.ts`, `RunRecord/RunMeta` in `storage.ts`.

## Scenarios

Static student personas in `scenarios/` — pre-written student turns that exercise known problem patterns. Each scenario has an `evalMode` that determines which topic dimension the judge scores:

| File | Level | evalMode | Pattern |
|------|-------|----------|---------|
| `a1-confused-beginner-food.json` | A1 | `coherence` | Hesitant, 1-2 word answers |
| `a1-silent-beginner.json` | A1 | `discovery` | Only monosyllables — oui/non/d'accord |
| `a2-shy-student-travel.json` | A2 | `coherence` | Mixes English — engagement cliff test |
| `a2-one-word-answers.json` | A2 | `discovery` | Minimal responses — hardest engagement scenario |
| `b1-engaged-student-sport.json` | B1 | `coherence` | Talkative with grammar mistakes |
| `b1-mixed-language-cinema.json` | B1 | `coherence` | Switches to Spanish when stuck |
| `b1-deflecting-student.json` | B1 | `discovery` | Grammatically present but actively evasive |

The design is "Static seeds + LLM student" — student turns are fixed so results are reproducible across runs. LLM-generated student turns are a future option if you need broader coverage.

## Scoring dimensions

Each conversation is scored 1–5 on four axes. The **topic** axis depends on the scenario's `evalMode`:

- **engagement** — does the tutor keep the student wanting to continue?
- **teaching_quality** — natural vocab intro, recasts, teaching in context
- **topic_coherence** *(coherence scenarios)* — the student's declared interest is passed as an anchor; penalises drift to unrelated topics (e.g. weather)
- **topic_discovery** *(discovery scenarios)* — the student gave only minimal responses; scores whether the tutor actively probed for a concrete interest vs. defaulting to generic small talk
- **question_naturalness** — varied and conversational, not a forced question every turn

The summary report shows separate `Avg coherence` and `Avg discovery` rows. The compare table uses a unified `topic` column — each row picks whichever field is present.

## Running

Requires the Le France Professor backend and an Ollama instance to be running. URLs default to `http://localhost:3001` and `http://localhost:11434` but are fully configurable:

```bash
cd evals
npm install

# Run with defaults — saves to runs/run-{timestamp}.json
npm run eval

# Label the run and add an annotation
npm run eval -- --label baseline --note "default prompt, gemma3:4b"

# Override URLs, judge model, and runs directory
BACKEND_URL=http://localhost:3001 \
JUDGE_URL=http://localhost:11434 \
JUDGE_MODEL=gemma3:4b \
npm run eval -- --label baseline
```

Every run is automatically saved to `evals/runs/{label}.json` (gitignored). To compare two runs:

```bash
npm run compare baseline phase-v1
```

Output:

```
Comparing: baseline → phase-v1
  baseline         gemma3:4b  "default prompt"         (2026-03-28)
  phase-v1         gemma3:4b  "discovery phase added"  (2026-03-29)
────────────────────────────────────────────────────────────────────────
Scenario                        engage    teach     topic     q_nat
────────────────────────────────────────────────────────────────────────
a1-confused-beginner-food       3→4↑      4→4=      5→5=      2→3↑
a2-shy-student-travel           2→4↑      3→4↑      4→5↑      2→4↑
────────────────────────────────────────────────────────────────────────
Average                         2.5→4.0   3.5→4.0   4.5→5.0   2.0→3.5
```

CLI flags work too and take precedence over env vars:

```bash
npx tsx src/cli.ts run \
  --backend http://localhost:3001 \
  --judge-url http://localhost:11434 \
  --judge-model gemma3:4b \
  --label baseline \
  --note "default prompt"

npx tsx src/cli.ts compare baseline phase-v1
```

## Judge model comparison (2026-03-27, gemma3:4b tutor, 5 scenarios)

> **Note:** This data predates the `eval_mode` split. All 5 scenarios were scored with a single undifferentiated `topic_coherence` prompt — no interest anchor, no discovery dimension. The `cohere` column below reflects those old scores. Re-run with the current harness to get corrected `topic_coherence` / `topic_discovery` values.

Ran all four local models that fit in 8 GB RAM as judges, plus a manual Claude evaluation, against the same 5 scenario transcripts:

| Judge | engage | teach | cohere (old) | q_nat | avg |
|-------|--------|-------|--------|-------|-----|
| `gemma3:4b` | 3.6 | 3.6 | 4.2 | 3.6 | **3.75** |
| `llama3.2:3b` | 4.6 | 4.8 | 4.6 | 4.2 | **4.55** |
| `qwen2.5:3b` | 4.2 | 3.6 | 3.6 | 2.4 | **3.45** |
| `phi4-mini` | 4.2 | 3.6 | 3.6 | 2.4 | **3.45** |
| Claude (manual) | 3.6 | 2.8 | 4.2 | 3.0 | **3.40** |

**`gemma3:4b` is the default judge.** `llama3.2:3b` inflates scores and barely differentiates between scenarios. `qwen2.5:3b` and `phi4-mini` produced identical scores — likely converged on the same structured output pattern. `gemma3:4b` is the closest to the manual Claude evaluation and the most discriminating (correctly tanked `a2-one-word-answers` to 2/2/1/1).

## Tests

```bash
npm test          # unit tests only (judge, reporter, storage, compare)
npm run test:all  # unit + integration (nock intercepts HTTP — no live servers needed)
```

Integration tests use [nock](https://github.com/nock/nock) to intercept both the backend and the Ollama judge. HTTP calls use `node-fetch` v2 (nock only intercepts the Node.js `http` module, not native fetch / undici).

Storage and compare tests use `os.tmpdir()` temp directories — isolated per suite, cleaned up after each test.
