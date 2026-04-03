# ADR-0029: CALIBRATION → FLOW phase system — topic discovery and anchoring for student engagement

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🤖 LLM & Prompts |
| Date | 2026-04-03 |

## Context

The eval harness baseline run (`evals/runs/baseline.json`) exposed the problem concretely: in the `a2-one-word-answers` scenario, the student expressed interest in **music**. By turn 3, the tutor was talking about the weather. The backend had no mechanism to pass topic context to the LLM — it fell back to generic small talk every session.

Two failure modes compounded each other:

1. **No topic discovery** — the tutor opened with `Ça va ?` and never elicited what the student wanted to talk about.
2. **Alignment drift** — even when the student mentioned a topic early, the LLM drifted away from it as the context window grew. Documented in the BEA 2025 paper on CEFR-prompted LLMs: the model reverts to generic conversation unless the topic is *explicitly re-injected* into the system prompt each turn, not merely present in the chat history.

The candidate solutions for topic discovery were:
- A blocking topic-picker form before the conversation starts
- A one-time onboarding interest list
- Conversational elicitation inside the first turns

### Why no blocking topic screen

SDT research (Deci & Ryan), CALL studies, and competitor app teardowns all converge on the same answer: **no form, no topic picker before the conversation starts**. Discovery happens inside the conversation.

A 2025 Frontiers in Psychology study found that unrestricted topic autonomy alone *underperforms* — learners gravitating toward easy familiar topics and avoiding challenge. Autonomy works best within structured guidance, not as an unbounded menu. A 2025 ScienceDirect study (n=840) found that enjoyment and emotional support predicted engagement more than choice breadth.

Competitor pattern: no major app uses a blocking topic screen per session. Duolingo Max, Loora, and Speak all start the conversation immediately. Where topic selection exists (Speak, Talkio), it is optional and post-onboarding, never a gate. Duolingo's most documented onboarding experiment — pushing the signup form until *after* a first lesson — produced a +20% Day-1 retention increase. "Value first, requests second."

Since there is no signup flow in Le France Professor, the CALIBRATION phase handles topic discovery conversationally each session.

## Decision

The conversation is split into two phases based on the student's **message count** on the `Conversation` entity:

**CALIBRATION** (first 4 student messages): The tutor uses a discovery-focused system prompt. Objective: find out what the student genuinely enjoys talking about. The tutor opens warmly (never `Ça va ?` — generic greetings are the #1 cited CALL design flaw) and asks one open question about interests in the first turn. Teaching rules apply from the start — recasting errors, introducing vocabulary in context.

**FLOW** (message 5 onward): The tutor switches to the full tuned prompt (ADR-0020). If a topic was discovered, it is re-injected into the system prompt every turn as `Sujet de l'étudiant : {topic} — reste ancré sur ce sujet`. If the topic is not yet known, the prompt degrades gracefully to the generic tuned prompt — no anchor, no crash.

The phase is computed on the `Conversation` entity via `phase()` and `userMessageCount()` — no explicit state field, derived from message count. The topic is stored as `Conversation.topic: string | null` (same pattern as `title`) and passed explicitly to `generateResponse()` as a `TutorResponseContext` object `{ phase, topic }`.

The topic is extracted by a fire-and-forget LLM call triggered after the 4th student message (`ExtractTopicUseCase`). The extraction prompt uses `temperature: 0.3` and `max_tokens: 20`. Fallback: `'général'`.

The CALIBRATION and FLOW prompts are **fully separate**. The FLOW prompt (result of 4 tuning iterations, ADR-0020) is never modified — the topic anchor is an addendum line appended only when a topic is known. CALIBRATION can be tuned independently.

## Consequences

- Student engagement improves: the conversation stays anchored to what the student cares about from the first exchange.
- Alignment drift is prevented by explicit re-injection every FLOW turn — the LLM does not need to infer the topic from chat history.
- The phase switch is invisible to the student — no UI change, no form, no phase indicator.
- `generateResponse()` now takes an explicit `TutorResponseContext` — callers must pass phase + topic. The interface is honest about what the tutor needs.
- `'général'` fallback: FLOW degrades gracefully to pre-phase behavior if extraction fails or is delayed.
- The tuned FLOW prompt is untouched — topic discovery and FLOW quality can be iterated independently.

## References

- [Topic Discovery in CALIBRATION — Notion card](https://www.notion.so/331b476cc3b78197a161e5dc6c5f430f) — full research synthesis, app teardowns, SDT literature, implementation options
- [Alignment Drift in CEFR-prompted LLMs — BEA 2025](https://aclanthology.org/2025.bea-1.6/) — key finding: re-injection into system prompt every few turns, not relying on chat history
- [The human touch in AI: SDT and teacher scaffolding — Frontiers in Psychology, 2025](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1568239/full) — unrestricted autonomy underperforms; structured guidance + autonomy wins
- [Enjoyment, motivation, self-efficacy, engagement in AI-assisted learning — ScienceDirect, 2025](https://www.sciencedirect.com/science/article/abs/pii/S0023969025001043) (n=840) — enjoyment and emotional support > choice breadth
- [Duolingo onboarding UX — +20% Day-1 retention from value-first](https://goodux.appcues.com/blog/duolingo-user-onboarding) — sign-up deferred until after first lesson
- [SDT Language Learning — selfdeterminationtheory.org](https://selfdeterminationtheory.org/topics/language-learning/)

## Source Conversation

> **Mar 28** — Notion card "Topic Discovery in CALIBRATION" created, researched, and scoped (see card above for full research synthesis).
>
> **Apr 3** — Implementation session.
>
> **You:** what about starting [Notion card] — /feature
>
> **Claude:** [proposed 3 options: A — predefined topic list, B — topic stored on entity + explicit param to generateResponse, C — topic in chat history only]
>
> **You:** the title is following the Path B, yeap?
>
> **Claude:** Correct — Path B hybrid. Topic stored on the entity like title, explicit params passed to generateResponse.
>
> **You:** [interrupted] why are you changing the prompt strategy in the flow state ??? we made this work for discovering the tuned prompt — make sense?
>
> **Claude:** You're right — the FLOW prompt is the result of 4 tuning iterations. Reverting to the exact existing prompt and only adding the topic anchor as an addendum.
