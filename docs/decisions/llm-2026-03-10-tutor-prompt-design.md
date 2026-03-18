# ADR-0020: Tutor prompt design — tu, short, always a question, anti-repetition penalties

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🤖 LLM & Prompts |
| Date | 2026-03-10 |

## Context

LLM responses were too long, formal (vous), and did not maintain conversational flow. After switching to gemma3:4b, the prompt needed to be rewritten to match the tutor's pedagogical goals.

## Decision

System prompt enforces: informal tu, 1-2 sentences max (up to 3 for explanations), always ends with a question. max_tokens: 50 (initiation) / 120 (responses). repeat_penalty: 1.15 + presence_penalty: 0.3.

## Consequences

- Token limits prevent rambling even if the model ignores the instruction.
- repeat_penalty + presence_penalty are set on both initiation and response calls.
- Vocabulary explanation uses a separate system prompt — the tutor prompt conflicts with vocabulary cards.

## Source Conversation

> **Mar 10 — Tuesday — 12:32**
>
> **You:** my feedback is related to the lenght ... probably is better to maintain the lenght short ... but sometimes is better explain better ... and more pushing for interactions ... comming back with a question ... I liked your feedback ... can we improve with your and mine feedback the instructions ??? the model is still good in your opinion ?
>
> **Claude:** The model is fine — the issues we saw are prompt problems, not model problems. gemma3:4b is doing well for 8GB RAM. Here's the combined rewrite encoding the canonical rules: tu, 1-2 sentences (up to 3 for explanations), always ends with a question, max_tokens: 120, repeat_penalty: 1.15 + presence_penalty: 0.3.
