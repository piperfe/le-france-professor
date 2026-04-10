# ADR-0030: WhatsApp via Meta Cloud API webhook — one conversation per phone number

| Field | Value |
|-------|-------|
| Status | Established |
| Domain | 🏗️ System Architecture |
| Date | 2026-04-10 |

## Context

The web frontend creates friction: students have to open a browser tab, wait for the page to load, and context-switch away from their phone. This friction reduces the number of real conversations, which slows down the feedback loop needed to improve the tutor experience. WhatsApp is already open on the student's phone all day.

Three options were considered:
- **Twilio** — adds a paid middleman, extra dependency, and another API surface
- **whatsapp-web.js** — reverse-engineers the WhatsApp Web protocol; brittle, violates Terms of Service
- **Meta WhatsApp Cloud API** — the official path; free tier covers development, no middleman

## Decision

Integrate with the **Meta WhatsApp Cloud API** using the standard webhook pattern:

- `GET /api/webhook/whatsapp` — Meta verification handshake (echoes `hub.challenge` when `hub.verify_token` matches)
- `POST /api/webhook/whatsapp` — receives messages; non-text events (status updates, images, etc.) are silently acknowledged with 200 and discarded

### Where does `WhatsAppSender.sendMessage()` live?

The first instinct was to call `whatsAppSender.sendMessage()` directly from the adapter handler, after the use case returns the tutor response. The counterargument: the use case's job is to orchestrate the conversation — getting a response and delivering it back to the student are both part of that business flow, not adapter concerns. If the send fails, the whole operation should fail as one unit; splitting it across layers would require awkward error propagation back through the HTTP handler.

**Decision:** `HandleWhatsAppMessageUseCase` owns the full flow — it calls `CreateConversationUseCase` or `SendMessageUseCase`, then calls `WhatsAppSender.sendMessage()` as the final step. `WhatsAppSender` is a **domain interface** (`domain/services/whatsapp-sender.ts`); `MetaWhatsAppClient` is the infrastructure implementation. The adapter handler is thin: parse the Meta payload → call the use case → return 200.

### How many turns does a WhatsApp conversation have?

On the frontend, the conversation lifecycle is **user-driven**: the student explicitly starts a new conversation from the sidebar. Each conversation is a discrete session with its own topic discovery, title generation, and CALIBRATION → FLOW progression.

WhatsApp has no equivalent UI affordance. There is no "new conversation" button. The student just sends a message.

Options considered:
- **Per-day reset** — start a fresh conversation each calendar day
- **Per-N-turns reset** — rotate after a fixed number of exchanges
- **One conversation per phone, forever** — never reset automatically

**Decision:** One conversation per phone number, no automatic reset. `PhoneSessionRepository` maps `phone → conversationId`. The first message from a phone triggers `CreateConversationUseCase` (CALIBRATION greeting); all subsequent messages use `SendMessageUseCase` against the same conversation — topic anchoring and the FLOW phase accumulate across days.

This is intentionally different from the frontend model. The reasoning: forcing a daily reset would interrupt an ongoing topic thread the tutor has built up. The student can always send "nouveau sujet" or similar if they want a change of direction — the tutor handles that naturally. Per-day or per-N resets can be introduced later without changing the core flow (they would just clear `PhoneSessionRepository` on a schedule or threshold).

## Consequences

- Students can practice French entirely from WhatsApp — zero browser friction, more real conversations, better tutor calibration data
- The tutor pipeline (`CreateConversationUseCase`, `SendMessageUseCase`, topic anchoring, title generation) is reused unchanged; WhatsApp is just another entry point
- `WhatsAppSender` as a domain interface keeps the use case testable with any sender mock — the use case does not know about Meta
- Meta requires a verified Business Account and a webhook URL reachable from the internet (ngrok or a deployed server) for local development
- Free tier: 1,000 conversations/month per phone number; up to 5 test numbers before business verification; no time limit on the free tier
- The one-conversation-per-phone model keeps `PhoneSessionRepository` simple (a Map) — future resets (daily, per-turn threshold, explicit command) would only touch the session layer, not the use cases

## Source Conversation

> **Apr 10 — Thursday**
>
> **You:** I wanna connect the tutor with whatsapp ... is it difficult ??? we'll primarily migrate the conversation ... then the vocabulary features (if it's possible)
>
> **You:** Option B is the official path isn't it?
>
> **You:** the use case don't need to orchestrate this sendMessage() ???? what do you think ? architecturally ?
>
> **You:** are you thinking about keeping the conversationId (concept) by phone ... then we're only using SendMessageUseCase not the CreateConversationUseCase ??? what about different days ??? different conversations ???
>
> **You:** let's keep the conversation initiation 1 time only ... then we can change per day, calculate the states of a conversation, etc ... but keep a different use case for flexibility
>
> **You:** in my personal case ... there is a friction to use the application through the front end ... so I needed more conversations data for getting a better experience with the professor
