# Le France Professor

A French learning application with LLM reasoning, built with hexagonal architecture and Domain-Driven Design principles.

## Architecture

This project follows hexagonal architecture (ports and adapters) for both backend and frontend:

### Backend Structure
```
backend/
├── domain/          # Core business logic, entities, value objects
├── application/     # Use cases
├── infrastructure/  # LLM integration, repositories, telemetry
└── adapters/        # HTTP handlers, routes
```

### Frontend Structure
```
frontend/
├── domain/          # Domain models, repositories (interfaces)
├── application/     # Use cases
├── infrastructure/  # API client
└── adapters/        # UI components, hooks
```

## Features

- **Chat Interface**: Interactive French conversation with an AI tutor
- **Topic Initiation**: Tutor initiates conversations on interesting topics:
  - AI adoption in France
  - French culture
  - French language in the world

## API Documentation

The backend serves interactive API documentation via [Scalar](https://scalar.com) at:

```
http://localhost:3001/docs
```

The spec covers all endpoints with request/response schemas, examples, and a built-in HTTP client to try requests directly from the browser. The OpenAPI spec is defined in `backend/src/adapters/http/openapi-spec.ts`.

## Observability

The backend emits OpenTelemetry traces covering HTTP requests, use-case executions, and LLM calls (with `gen_ai.*` semantic conventions). See [OBSERVABILITY.md](./OBSERVABILITY.md) for the full trace hierarchy, how to read console output, and how to run the local Grafana stack.

## Development

```bash
# Install dependencies
npm install

# Run backend
npm run dev:backend

# Run frontend
npm run dev:frontend

# Run all tests
npm run test:all
```

See [QUICKSTART.md](./QUICKSTART.md) for full setup instructions.
