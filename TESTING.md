# Testing

## Strategy

Both backend and frontend follow a **Testing Trophy** approach — the philosophy is stack-agnostic even though Kent C. Dodds popularised it in a React context. The core idea is the same: tests that resemble how the software is actually used give more confidence per dollar than pure unit tests with aggressive mocking. Integration tests carry the most weight; unit tests fill in error branches and edge cases that are hard to trigger through a real HTTP or browser interaction; static analysis (TypeScript + ESLint) is the free bottom layer.

The layers manifest differently depending on what the code does, not because of a different philosophy:

### Backend

| Layer | Tool | What is mocked |
|---|---|---|
| **Static analysis** | TypeScript + ESLint + eslint-plugin-boundaries | — |
| **Unit** | Jest | All dependencies — validates error branches and per-layer contracts |
| **Integration** | Jest + Supertest + Nock | Only the external LLM call — full Express stack exercised as a real HTTP client would |

The integration layer is the **primary confidence signal**. Unit tests exist to cover paths that are difficult to trigger through the HTTP layer.

### Frontend

| Layer | Tool | What is mocked |
|---|---|---|
| **Static analysis** | TypeScript + ESLint | — |
| **Unit** | Vitest (node) | Repository — validates domain entities and use case logic |
| **Integration** | Vitest (node) | Use cases via `vi.mock` — validates Route Handler request parsing and response shaping |
| **Component** | Vitest + RTL + MSW | Network — validates Client Component interactions and async state in jsdom |
| **E2E** | Playwright | Nothing — production Next.js build + stub backend, no Ollama required |

Async RSC Server Components (`/conversation/[id]/page.tsx`) are not unit-tested — Vitest does not support async RSC. They are covered end-to-end by the Playwright layer.

---

## Running Tests

### Backend

All commands from `backend/`:

```bash
# All tests (unit + integration)
npm test

# Unit tests only — fast, no I/O
npm run test:unit

# Integration tests only — hits the full Express app via HTTP
npm run test:integration

# With coverage report (80% threshold enforced)
npm run test:coverage

# Watch mode
npm run test:watch
```

### Frontend

All commands from `frontend/`:

```bash
# Unit + integration + component tests (Vitest)
npm test

# Watch mode
npm run test -- --watch

# With coverage
npm run test:coverage

# E2E tests (Playwright — requires a prior build)
npm run test:e2e

# E2E with interactive UI
npx playwright test --ui
```

> **Note:** `npm run test:e2e` starts a stub backend on port 5101 and a production Next.js server on port 5100 automatically via Playwright's `webServer`. No manual setup needed. If those ports are already in use, Playwright will reuse the existing servers (local dev mode).

---

## Backend Tests

### Unit tests

Unit tests live alongside source files (`*.test.ts`). Each file covers one layer in isolation:

```
domain/entities/           → pure logic, zero mocks
application/use-cases/     → mock ConversationRepository + TutorService
adapters/http/handlers/    → mock UseCase, mock Express Request/Response
infrastructure/llm/        → mock OpenAI HTTP client (nock)
infrastructure/telemetry/  → mock span exporters
infrastructure/repositories/ → real SQLite via createDatabase(':memory:') — fresh db per test, no mocks
```

#### Error path coverage

HTTP error status codes are verified at the handler layer by injecting typed domain errors:

```ts
// domain/errors.ts — errors carry a code discriminator
export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const;
}
export class ServiceUnavailableError extends Error {
  readonly code = 'SERVICE_UNAVAILABLE' as const;
}

// HTTP_STATUS maps codes → status codes without instanceof chains
export const HTTP_STATUS: Record<string, number> = {
  NOT_FOUND: 404,
  SERVICE_UNAVAILABLE: 503,
};
```

### Integration tests

Integration tests are named `*.integration.test.ts` and live in two locations depending on what they test:

- **HTTP integration** — `adapters/http/integration/`: full Express stack via supertest + nock (LLM mocked)
- **Infrastructure integration** — alongside source in `infrastructure/`: real external dependency exercised against a file fixture, no HTTP (e.g. `ogg-to-wav-converter.integration.test.ts` runs real ffmpeg against `src/test/fixtures/silence.ogg` and validates the WAV header output)

```
integration/
├── post-conversations.integration.test.ts
├── post-message.integration.test.ts
├── get-conversation.integration.test.ts
├── get-all-conversations.integration.test.ts
├── post-vocabulary.integration.test.ts
└── llmMock.ts
```

`post-vocabulary.integration.test.ts` includes a key assertion: vocabulary lookups do **not** add messages to conversation history (`messages.length` stays at 1 after a vocabulary call). This guards against the vocabulary endpoint accidentally mutating conversation state.

**Testing fire-and-forget background tasks:**
Several tasks run after the HTTP response is returned:
- **Title generation** — triggered after the 2nd student message (`GenerateTitleUseCase`)
- **Topic extraction** — triggered after the 4th student message (`ExtractTopicUseCase`)
- **WhatsApp message processing** — the webhook handler responds 200 immediately; the full use case (LLM + Meta API send) runs async

All use the same pattern: a short `setTimeout` in the integration test allows the background chain to complete before asserting on the result.

> **Why not `setImmediate` loop?** The OpenAI SDK (used by `OllamaTutorService`) adds async layers between the nock intercept and the Promise chain that require real event loop time. A `setImmediate` loop drains microtasks but not those layers. `setTimeout(resolve, 50)` is a safe ceiling — with nock (in-memory, no network), the entire chain completes in < 1ms.

```ts
await request(app).post(`/api/conversations/${id}/messages`).send({ message: '...' })
// Give the background title generation time to complete
await new Promise((r) => setTimeout(r, 200))
const res = await request(app).get(`/api/conversations/${id}`)
expect(res.body.title).toBe('La cuisine française avec Sophie')
```

Each test spins up the real Express app via `createApp()`, sends HTTP requests using `supertest`, and mocks only the external LLM call using `nock`.

```ts
it('returns 200 with conversation when it exists', async () => {
  chatCompletionsMock('Salut ! Comment allez-vous ?'); // nock intercepts LLM call
  const createRes = await request(app).post('/api/conversations').expect(201);
  const getRes = await request(app)
    .get(`/api/conversations/${createRes.body.conversationId}`)
    .expect(200);
  expect(getRes.body.messages[0].content).toBe('Salut ! Comment allez-vous ?');
});
```

### Known setup: Scalar ESM mock

`@scalar/express-api-reference` is ESM-only. Jest runs in CommonJS mode and cannot parse ESM `import` statements inside `node_modules`. `jest.config.js` intercepts the import with a lightweight stub:

```js
moduleNameMapper: {
  '@scalar/express-api-reference': '<rootDir>/src/__mocks__/scalar.ts',
},
```

```ts
// src/__mocks__/scalar.ts
export const apiReference = () => (_req, _res, next) => next();
```

> If you upgrade `@scalar/express-api-reference` and integration tests fail with an ESM error, this mock is the first place to check.

---

## Frontend Tests

### Unit and integration tests (Vitest)

Vitest uses `environmentMatchGlobs` to run server-side files (`src/app/api/**`, `src/application/**`, `src/domain/**`, `src/infrastructure/**`, `src/lib/**`) in a Node environment and UI files in jsdom.

**Domain / use cases** (`src/domain/`, `src/application/`) — pure logic, mocked repository:

```ts
it('returns a ServiceUnavailableError when the repository throws', async () => {
  mockRepository.create.mockRejectedValue(new Error('LLM down'))
  const result = await useCase.execute()
  expect(result.isErr()).toBe(true)
})
```

**Route Handlers** (`src/app/api/**/route.test.ts`) — `NextRequest` constructed directly, use case mocked via `vi.mock`:

```ts
vi.mock('../../../lib/container', () => ({
  createConversationUseCase: { execute: vi.fn() },
}))

it('returns 201 with conversationId on success', async () => {
  vi.mocked(createConversationUseCase.execute).mockResolvedValue(
    ok({ conversationId: 'conv-1', initialMessage: 'Bonjour !' }),
  )
  const req = new NextRequest('http://localhost/api/conversations', { method: 'POST' })
  const res = await POST(req)
  expect(res.status).toBe(201)
})
```

### Component tests (Vitest + RTL + MSW)

Client Components are rendered in jsdom with [`@testing-library/react`](https://testing-library.com/react) v16 and network calls intercepted by [MSW v2](https://mswjs.io) (`msw/node`).

Key conventions:
- MSW server is instantiated **inline in each test file** — no shared `handlers.ts` or `server.ts`
- Components call `fetch('/api/...')` with relative URLs — MSW handlers must use the same relative paths (e.g. `'/api/conversations'`, not `'http://localhost/api/conversations'`)
- Use `delay()` from MSW only when asserting an **in-flight loading state** (the delay keeps the response pending past `await user.click()` so the loading indicator is observable)
- Queries follow RTL priority: `getByRole` first, then `getByText`
- Browser APIs not available in jsdom (`MediaRecorder`, `getUserMedia`) are mocked via `vi.stubGlobal()` — co-located in the test file of the single component that uses them, not in `setup.ts`
- `window.matchMedia` is mocked with `Object.defineProperty(window, 'matchMedia', ...)` — avoid `vi.stubGlobal('window', ...)` as spreading `window` breaks React's concurrent internals
- `HTMLAudioElement` (used by TTS) is mocked via `vi.stubGlobal('Audio', MockAudio)` — co-located in `tts-button.test.tsx`; `play()` returns `Promise.resolve()` immediately so the hook transitions to `playing` state synchronously in tests
- `URL.createObjectURL` / `URL.revokeObjectURL` do not exist in jsdom — define them with `Object.defineProperty(URL, 'createObjectURL', { writable: true, value: vi.fn()... })` before each test; `vi.spyOn` will throw `createObjectURL does not exist`
- `Element.prototype.scrollIntoView` does not exist in jsdom — stubbed globally in `src/test/setup.ts` as `Element.prototype.scrollIntoView = () => {}` so components that call it (e.g. `VocabularyNotebook` scrolling to a highlighted entry via ref callback) do not throw in tests
- Overlay backdrop buttons: use `<button type="button" aria-label="Fermer le menu">` (not a plain `<div onClick>`) so the backdrop is queryable via `getByRole('button', { name: 'Fermer le menu' })` and its presence/absence can be asserted without relying on CSS class selectors
- Async click handlers that call `await audio.play()` trigger a state update outside the `userEvent` act boundary — use `fireEvent.click(btn)` + `await act(async () => {})` instead of `await userEvent.click()` when asserting the `playing` state

```ts
const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => { server.resetHandlers(); vi.clearAllMocks() })
afterAll(() => server.close())

it('shows loading indicator while in flight, then the tutor response', async () => {
  server.use(
    http.post(MESSAGES_PATH, async () => {
      await delay(50) // keeps response pending so loading state is assertable
      return HttpResponse.json({ tutorResponse: 'Très bien !' })
    }),
  )
  await user.click(submitButton)
  expect(screen.getByText('Le tuteur écrit...')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByText('Très bien !')).toBeInTheDocument())
})
```

### E2E tests (Playwright)

E2E tests live in `frontend/e2e/` and run against a **production Next.js build** with a **stub backend** — no Ollama required.

```
frontend/
├── e2e/
│   ├── helpers.ts              # Shared: constants, startConversation, addFakeAudio, addFakeMediaRecorder
│   ├── conversation.spec.ts    # Core conversation flow
│   ├── voice-input.spec.ts     # Voice input — desktop (click-toggle) + mobile (press-hold)
│   ├── tts.spec.ts             # TTS — speaker, slow, stop, multi-message
│   ├── vocabulary.spec.ts      # /vocabulary command + notebook (badge, drawer, highlight, persist)
│   ├── sidebar.spec.ts         # Multi-conversation sidebar navigation
│   ├── welcome.spec.ts         # Welcome page — recent conversations list appears and navigates
│   └── stub-backend.mjs        # Minimal HTTP server replacing the real backend
└── playwright.config.ts
```

The stub backend (`stub-backend.mjs`) is a plain Node.js HTTP server that returns deterministic responses for all five API endpoints the frontend depends on. Playwright's `webServer` starts it automatically on port 5101 before running tests.

E2E tests cover three user journeys:

**Welcome page — recent conversations:**
1. Click "Commencer" on the home page — navigate to `/conversation/[id]`
2. Navigate back to `/` — "conversations récentes" section appears with a list item for the conversation just created
3. Click a list item — navigate to a conversation page showing the tutor's initial greeting

**Text conversation flow:**
1. Land on home page — see "Le France Professor" heading
2. Click "Commencer" — navigate to `/conversation/[id]`
3. See the tutor's initial greeting (rendered server-side by the RSC page)
4. Type a message and click "Envoyer"
5. User message appears optimistically
6. Tutor reply arrives

**Voice input — desktop (click-to-toggle):**
1. Navigate to the conversation page
2. Click the mic button — recording state activates
3. Click again to stop — transcription appears in the input box
4. Send the transcribed message

**Voice input — mobile (press-and-hold):**
1. Navigate to the conversation page (`matchMedia` overridden to simulate `pointer: coarse`)
2. `touchstart` on the mic button — recording state activates
3. `touchend` — transcription appears in the input box
4. Send the transcribed message

**TTS — speaker and slow buttons:**
1. Navigate to the conversation page — speaker (▶) and slow (🐢) buttons visible below tutor message
2. Click speaker — stop button appears (audio playing)
3. Click stop — speaker button returns
4. Click slow — verifies `lengthScale: 1.5` is sent in the POST body to `/api/tts`
5. Two messages: play message 1, click message 2's speaker — message 1's button resets, message 2 plays

**`/vocabulary` slash command:**
1. Type `/` in the input — autocomplete popup appears with `/vocabulary` and its description
2. Type `/vocabulary passée` and send — no user bubble in the chat, vocabulary card with `📖 passée` header and explanation appears inline
3. Type `/vocabulary` (no word) and send — inline hint `Usage : /vocabulary [mot]` appears

**Vocabulary notebook:**
1. Badge on `📖 Vocabulaire` button shows word count after a `/vocabulary` command succeeds
2. Clicking the button opens the drawer — saved entry visible inside a `<li>` (word + explanation)
3. Clicking the `×` button closes the drawer
4. Saved words persist across navigation — badge count and drawer entries reload from the server on return
5. Saved word is highlighted (`<mark>`) in the source tutor message; highlight persists after navigation because the backend returns `messageId` on `POST /messages` and the frontend uses it directly for `sourceMessageId` matching
6. Clicking a highlighted word opens the drawer with that entry remarked (`li.bg-vocab-50`)

**Sidebar multi-conversation flow:**
1. Create conv1 — sidebar shows its title
2. Create conv2 via "+" — sidebar shows both titles (2 entries)
3. Navigate back to conv1 via `page.goto(conv1Url)` — conv1 messages are restored from the stub; conv2 messages are absent

Browser APIs (`MediaRecorder`, `getUserMedia`) are injected as fakes via `page.addInitScript()` before the page loads. The `/api/transcribe` BFF route is mocked via `page.route()` — no real whisper.cpp server required.

The stub backend is stateful across a test run (Map-based in-memory store). Since tests run in parallel and share the same stub backend, sidebar count assertions use `toBeGreaterThanOrEqual` rather than exact counts to remain stable under parallelism.

```ts
await page.addInitScript(() => {
  class FakeMediaRecorder { /* stops immediately with a fake blob */ }
  window.MediaRecorder = FakeMediaRecorder
  navigator.mediaDevices.getUserMedia = () => Promise.resolve(fakeStream)
})
await page.route('/api/transcribe', (route) =>
  route.fulfill({ json: { text: 'Je voudrais un café' } }),
)
```

Only Chromium is used in E2E — cross-browser coverage is deferred until the product stabilises.

---

## neverthrow

All use cases in both the backend and frontend return typed `ResultAsync` via [neverthrow](https://github.com/supermacro/neverthrow). Errors are part of the function signature — callers cannot ignore them:

```ts
execute(id: string): ResultAsync<ConversationDTO, NotFoundError | ServiceUnavailableError>
```

Backend handlers use `result.match()`:

```ts
result.match(
  (conversation) => res.status(200).json(conversation),
  (error) => res.status(HTTP_STATUS[error.code] ?? 500).json({ error: error.message }),
)
```

Frontend Route Handlers use `result.isOk()` / `result.isErr()`. Tests use `ok()` / `err()` from neverthrow to build mock return values and assert on `result.isOk()` / `result.isErr()`.

---

## CI Pipeline

Both test suites run on every push and pull request to `main` via GitHub Actions (`.github/workflows/ci.yml`).

**Backend job:** typecheck → lint → unit tests → integration tests

**Frontend job:** typecheck → lint → Vitest (unit + integration + component) → build → install Playwright browsers → E2E tests

---

## Architecture Decisions

The decisions that shaped the testing strategy are recorded in [`docs/decisions/`](./docs/decisions/):

| ADR | Decision |
|-----|----------|
| [ADR-0009](./docs/decisions/testing-2026-03-04-testing-trophy-integration-first.md) | Testing Trophy over Testing Pyramid — integration tests are the priority |
| [ADR-0011](./docs/decisions/testing-2026-03-12-msw-inline-per-test-file.md) | MSW inline per test file — no shared handlers.ts |
| [ADR-0012](./docs/decisions/testing-2026-03-15-e2e-one-spec-per-feature.md) | E2E: one spec file per feature + shared helpers.ts |
| [ADR-0013](./docs/decisions/testing-2026-03-12-tests-same-step-as-code.md) | Tests are written in the same step as code — never deferred |
| [ADR-0031](./docs/decisions/arch-2026-04-11-eslint-boundaries-hexagonal-enforcement.md) | eslint-plugin-boundaries — hexagonal layer violations caught at lint time |
| [ADR-0032](./docs/decisions/arch-2026-04-14-sqlite-drizzle-backend-persistence.md) | SQLite + Drizzle ORM — repository unit tests use `:memory:` SQLite, no mocks |
