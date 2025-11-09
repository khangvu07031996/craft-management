import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} does not exist`,
  });
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err);

  res.status(500).json({
    success: false,
    message: 'An error occurred on the server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};

