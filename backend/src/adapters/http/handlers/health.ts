import type { RequestHandler } from 'express';

export const createHealthHandler = (): RequestHandler => {
  return (req, res) => {
    res.json({ status: 'ok' });
  };
};
