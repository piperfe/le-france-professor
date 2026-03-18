# ADR-0019: Model selection: gemma3:4b for 8 GB RAM — EuroLLM banned

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🤖 LLM & Prompts |
| Date | 2026-03-09 |

## Context

EuroLLM-9B was the initial model but produced repetitive, role-confused responses. Research was done to find the best model for a French conversation tutor constrained to local hardware.

## Decision

gemma3:4b (RLHF-aligned) is the default for 8 GB RAM. 16 GB → mistral-nemo. 32 GB → mistral-small3.2. EuroLLM-9B is explicitly banned — SFT-only, repeats itself.

## Consequences

- gemma3:4b is RLHF/DPO aligned — far better instruction following than SFT-only alternatives.
- ggml-small.en.bin for whisper is banned — .en models ignore language=fr and always transcribe in English.
- Use ggml-small.bin (multilingual) for whisper.cpp.

## Source Conversation

> **Mar 9 — Monday — 12:25**
>
> **You:** can you research a bit ... which model is the best for this use case ???
