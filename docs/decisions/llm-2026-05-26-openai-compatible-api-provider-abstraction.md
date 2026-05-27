# ADR-0039: OpenAI-compatible API as unified LLM interface — Ollama and Groq via env vars

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🤖 LLM & Prompts |
| Date | 2026-05-26 |

## Context

The backend initially hardwired Ollama as the only LLM provider (`OllamaTutorService`, `OllamaTitleService`, `OllamaVocabularyService`). This made the app unusable on machines without a GPU or sufficient RAM to run local models, including CI environments, contributors without Apple Silicon, and hosted deployments.

Groq provides an OpenAI-compatible HTTP API (`https://api.groq.com/openai/v1`) with a free tier and no local setup. The Ollama HTTP server also exposes an OpenAI-compatible endpoint (`/v1`). Both accept the same request/response shape — only the base URL, model name, and API key differ.

## Decision

Replace provider-specific service classes with a single `LlmConfig` interface (`baseURL`, `model`, `apiKey?`) and rename all services to provider-agnostic names (`LlmTutorService`, `LlmTitleService`, `LlmVocabularyService`). Provider selection is entirely via env vars:

```
LLM_BASE_URL=http://localhost:11434/v1   # Ollama (default)
LLM_MODEL=gemma3:4b
LLM_API_KEY=                             # omit for Ollama

LLM_BASE_URL=https://api.groq.com/openai/v1   # Groq
LLM_MODEL=llama-3.3-70b-versatile
LLM_API_KEY=gsk_...
```

The same abstraction is applied to the eval harness judge (`JudgeConfig` in `evals/src/judge.ts`), controlled via `JUDGE_BASE_URL`, `JUDGE_MODEL`, and `JUDGE_API_KEY`.

## Consequences

- Any OpenAI-compatible provider works without code changes — swap the env vars.
- `LLM_BASE_URL` and `LLM_MODEL` are now required by Zod; omitting them crashes the server with a clear error.
- `LLM_API_KEY` is optional — Ollama works without it (the SDK sends `"ollama"` as a placeholder).
- The evals judge and the backend tutor use the same interface, so both can run against Groq for CI or low-RAM environments.
- `instrumentation-openai` still emits `gen_ai.*` span attributes regardless of which provider is used, since all traffic goes through the OpenAI SDK.
