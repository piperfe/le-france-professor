# Testing

## Strategy

The backend follows a two-layer test strategy that mirrors the hexagonal architecture:

| Layer | Pattern | Purpose |
|---|---|---|
| **Unit** | Each file tested in isolation with mocked dependencies | Validates specific paths, error branches, and contracts per layer |
| **Integration** | Full HTTP stack, only the external LLM mocked | Validates that all layers execute together correctly (happy path) |

---

## Running Tests

All commands run from `backend/`:

```bash
# All tests (unit + integration)
npm test

# Unit tests only — fast, no I/O, safe to run on every save
npm run test:unit

# Integration tests only — hits the full Express app via HTTP
npm run test:integration

# With coverage report (80% threshold enforced)
npm run test:coverage

# Watch mode for development
npm run test:watch
```

---

## Unit Tests

Unit tests live alongside the source files they test (`*.test.ts`). Each test file covers one layer in isolation:

```
domain/entities/           → pure logic, zero mocks
domain/value-objects/      → pure logic, zero mocks
application/use-cases/     → mock ConversationRepository + TutorService
adapters/http/handlers/    → mock UseCase, mock Express Request/Response
infrastructure/            → mock external clients (OpenAI, telemetry)
```

### Error path coverage

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

Handler tests mock the use case to throw each typed error and assert the correct HTTP status:

```ts
it('returns 404 when conversation is not found', async () => {
  mockUseCase.execute.mockReturnValue(errAsync(new NotFoundError('Conversation not found')));
  await handler(mockRequest as Request, mockResponse as Response);
  expect(mockResponse.status).toHaveBeenCalledWith(404);
});
```

---

## Integration Tests

Integration tests live in `adapters/http/integration/` and are named `*.integration.test.ts`.

```
integration/
├── post-conversations.integration.test.ts
├── post-message.integration.test.ts
├── get-conversation.integration.test.ts
└── llmMock.ts
```

Each test:
1. Spins up the real Express app via `createApp()`
2. Sends HTTP requests using `supertest`
3. Mocks only the external LLM HTTP call using `nock`
4. Asserts on the full HTTP response (status + body)

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

This pattern mirrors how the backend integration tests work in the backend: `supertest` replaces the HTTP client, `nock` replaces the LLM.

---

## Known Setup: Scalar ESM Mock

**Why it exists:** `@scalar/express-api-reference` is an ESM-only package. Jest runs in
CommonJS mode by default and cannot parse ESM `import` statements inside `node_modules`.
Since `index.ts` statically imports Scalar at the top level, every integration test that
imports `createApp` would crash at module load time — before any test runs:

```
SyntaxError: Cannot use import statement outside a module
  at node_modules/@scalar/express-api-reference/dist/index.js:1
```

**The fix:** `jest.config.js` uses `moduleNameMapper` to intercept the import and redirect
it to a lightweight stub before Jest ever opens the real package:

```js
// jest.config.js
moduleNameMapper: {
  '@scalar/express-api-reference': '<rootDir>/src/__mocks__/scalar.ts',
},
```

```ts
// src/__mocks__/scalar.ts
export const apiReference = () => (_req, _res, next) => next();
```

The stub has the same signature as the real middleware — `(options) => expressMiddleware` —
but simply calls `next()` and moves on. The docs UI is irrelevant to API behaviour tests.

> If you upgrade `@scalar/express-api-reference` and the integration tests start failing
> with an ESM error again, this mock is the first place to check.

---

## neverthrow (Experiment in Progress)

`GET /api/conversations/:id` has been migrated to [neverthrow](https://github.com/supermacro/neverthrow)
as a proof of concept. Instead of throwing errors, the use case returns a typed `ResultAsync`:

```ts
// errors are part of the function signature — visible to every caller
execute(id: string): ResultAsync<ConversationDTO, NotFoundError | ServiceUnavailableError>
```

The handler uses `result.match()` instead of `try/catch`:

```ts
const result = await getConversationUseCase.execute(conversationId);
result.match(
  (conversation) => res.status(200).json(conversation),
  (error) => res.status(HTTP_STATUS[error.code] ?? 500).json({ error: error.message }),
);
```

The goal is to migrate all use cases and handlers to this pattern. See the
[neverthrow docs](https://github.com/supermacro/neverthrow) for the full API.
