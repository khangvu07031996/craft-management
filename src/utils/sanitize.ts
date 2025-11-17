/**
 * Sanitize sensitive data from objects to prevent logging sensitive information
 */

const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apiKey', 'apikey', 'authorization'];

/**
 * Recursively sanitize sensitive fields from an object
 * Replaces sensitive values with '[REDACTED]'
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    
    // Check if this field is sensitive
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]' as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Sanitize request body for logging
 */
export function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  return sanitizeObject(body);
}

/**
 * Sanitize error object to prevent exposing sensitive data
 */
export function sanitizeError(error: any): any {
  if (!error) {
    return error;
  }

  // If error has a message, sanitize it
  if (error.message) {
    const sanitizedError = { ...error };
    sanitizedError.message = error.message;
    
    // If error has additional properties, sanitize them
    if (error.body) {
      sanitizedError.body = sanitizeRequestBody(error.body);
    }
    if (error.request) {
      sanitizedError.request = sanitizeRequestBody(error.request);
    }
    
    return sanitizedError;
  }

  return error;
}

