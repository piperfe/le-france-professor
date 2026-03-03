export const HTTP_STATUS: Record<string, number> = {
  NOT_FOUND: 404,
  SERVICE_UNAVAILABLE: 503,
};

export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const;

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ServiceUnavailableError extends Error {
  readonly code = 'SERVICE_UNAVAILABLE' as const;

  constructor(message: string) {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}
