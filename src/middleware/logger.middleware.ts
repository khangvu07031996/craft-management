import { Request, Response, NextFunction } from 'express';
import { sanitizeRequestBody } from '../utils/sanitize';

/**
 * Request logger middleware
 * Logs request method, URL, status code, and duration
 * Does NOT log request body to prevent exposing sensitive data (like passwords)
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms`
    );
  });

  next();
};

/**
 * Development request logger (only logs in development)
 * Logs request body but sanitizes sensitive fields
 * WARNING: Only use in development, never in production
 */
export const devRequestLogger = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'development' && req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = sanitizeRequestBody(req.body);
    console.log(`[DEV] Request body:`, sanitizedBody);
  }
  next();
};

