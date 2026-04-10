import type { Request, Response } from 'express';

export function createVerifyWebhookHandler(verifyToken: string) {
  return (req: Request, res: Response): void => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === verifyToken) {
      res.status(200).send(challenge);
      return;
    }

    res.status(403).json({ error: 'Forbidden' });
  };
}
