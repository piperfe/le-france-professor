import { Request, Response, NextFunction } from 'express';

export const apiReference = () => (_req: Request, _res: Response, next: NextFunction) => next();
