import { Response } from 'express';

export function handleError(error: unknown, res: Response): void {
  const message = error instanceof Error ? error.message : 'Unknown error';
  res.status(500).json({ error: message });
}
