# Architecture Decision Records

This directory contains all Architecture Decision Records (ADRs) for Le France Professor.
ADRs capture significant technical and design decisions made during the project.

Files are named `{category}-{date}-{slug}.md` and organised by domain below.

---

## 🏗️ System Architecture

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-0001](./arch-2026-03-04-hexagonal-clean-architecture.md) | Hexagonal (Clean) Architecture — strict layering | Established | 2026-03-04 |
| [ADR-0002](./arch-2026-03-06-bff-pattern-browser-calls-bff-only.md) | BFF Pattern — browser never calls backend directly | Established | 2026-03-06 |
| [ADR-0003](./arch-2026-03-04-di-container-lib-container.md) | DI Container — lib/container.ts for server-side wiring | Established | 2026-03-04 |
| [ADR-0004](./arch-2026-03-02-openapi-embedded-in-express.md) | OpenAPI docs embedded in Express — not decoupled | Established | 2026-03-02 |

## ⚛️ Frontend Patterns

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-0005](./frontend-2026-03-04-tailwind-css-for-all-styling.md) | Tailwind CSS for all frontend styling | Established | 2026-03-04 |
| [ADR-0006](./frontend-2026-03-06-hook-thin-component-zero-useeffect.md) | Hook + thin component — zero useEffect | Established | 2026-03-06 |
| [ADR-0007](./frontend-2026-03-16-force-dynamic-static-root-page.md) | Static root page requires export const dynamic = "force-dynamic" | Established | 2026-03-16 |
| [ADR-0008](./frontend-2026-03-09-ssr-guard-lazy-usestate.md) | SSR guard for browser-only globals via lazy useState initialiser | Established | 2026-03-09 |

## 🧪 Testing Strategy

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-0009](./testing-2026-03-04-testing-trophy-integration-first.md) | Testing Trophy over Testing Pyramid — integration tests are the priority | Established | 2026-03-04 |
| [ADR-0011](./testing-2026-03-12-msw-inline-per-test-file.md) | MSW inline per test file — no shared handlers.ts | Established | 2026-03-12 |
| [ADR-0012](./testing-2026-03-15-e2e-one-spec-per-feature.md) | E2E: one spec file per feature + shared helpers.ts | Established | 2026-03-15 |
| [ADR-0013](./testing-2026-03-12-tests-same-step-as-code.md) | Tests are written in the same step as code — never deferred | Established | 2026-03-12 |

## 🛡️ Error Handling

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-0014](./errors-2026-03-15-neverthrow-resultasync-typed-errors.md) | neverthrow ResultAsync for use cases — typed errors at the boundary | Established | 2026-03-15 |
| [ADR-0015](./errors-2026-03-15-fire-and-forget-void-not-match.md) | Fire-and-forget ResultAsync: use void, not .match() | Established | 2026-03-15 |

## 📡 Observability

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-0016](./observability-2026-02-26-span-decorator-tracing.md) | @Span() decorator — tracing without polluting business logic | Established | 2026-02-26 |
| [ADR-0017](./observability-2026-02-26-dual-exporter-console-or-otlp.md) | Dual exporter — console (default) or OTLP via env var | Established | 2026-02-26 |
| [ADR-0018](./observability-2026-02-26-llm-content-as-otel-log-records.md) | LLM content captured as OTel log records — not span events | Established | 2026-02-26 |

## 🤖 LLM & Prompts

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-0019](./llm-2026-03-09-model-gemma3-4b-eurollm-banned.md) | Model selection: gemma3:4b for 8 GB RAM — EuroLLM banned | Established | 2026-03-09 |
| [ADR-0020](./llm-2026-03-10-tutor-prompt-design.md) | Tutor prompt design — tu, short, always a question, anti-repetition penalties | Established | 2026-03-10 |

## 🎙️ Voice & TTS

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-0021](./voice-2026-03-06-stt-whisper-cpp-local.md) | STT engine: whisper.cpp (local) over Web Speech API | Established | 2026-03-06 |
| [ADR-0022](./voice-2026-03-11-tts-piper-upmc-medium-jessica.md) | TTS engine: piper + fr_FR-upmc-medium (Jessica) over Kokoro | Established | 2026-03-11 |
| [ADR-0023](./voice-2026-03-06-webm-wav-conversion-in-bff.md) | WebM → WAV conversion in the BFF repository — not in the browser | Established | 2026-03-06 |
| [ADR-0024](./voice-2026-03-11-tts-singleton-one-audio-at-a-time.md) | TTS module-level singleton — one audio stream at a time | Established | 2026-03-11 |

## 🎨 UX Decisions

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-0025](./ux-2026-03-14-html-mockups-before-implementation.md) | Design mockups in HTML before any implementation | Established | 2026-03-14 |
| [ADR-0026](./ux-2026-03-15-vocabulary-notebook-drawer.md) | Vocabulary: notebook drawer not inline popover | Established | 2026-03-15 |

## ⚙️ Development Workflow

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-0027](./workflow-2026-03-03-no-dead-code-immediate-deletion.md) | No dead code — deleted immediately, no exceptions | Established | 2026-03-03 |
| [ADR-0028](./workflow-2026-03-12-slash-command-hook-on-second-command.md) | Slash command logic goes into a hook when the second command is added | Pending | 2026-03-12 |

---

## How to read an ADR

Each ADR follows this structure:
- **Context** — the situation that made a decision necessary
- **Decision** — what was decided, stated clearly
- **Consequences** — what changes as a result, positive and negative
- **Source Conversation** — the actual conversation where the decision was made

## Adding a new ADR

Name: `{category}-{YYYY-MM-DD}-{short-slug}.md`
Categories: `arch` | `frontend` | `testing` | `errors` | `observability` | `llm` | `voice` | `ux` | `workflow`
Status values: `Established` | `Pending` | `Reverted`
