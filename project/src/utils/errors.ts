/**
 * Centralized Error Handling Utility
 * Provides consistent error messages and handling across the application
 */

// ============================================================================
// Error Codes
// ============================================================================

export const ErrorCodes = {
  // Authentication & Authorization
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_FAILED: 'AUTH_FAILED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // Validation Errors
  INVALID_INPUT: 'INVALID_INPUT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // API Errors
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  
  // Database Errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  
  // Business Logic Errors
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  INVALID_STATE: 'INVALID_STATE',
  
  // File/Upload Errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // Unknown/Generic
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.UNKNOWN_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    
    // Maintains proper stack trace for where error was thrown
    Object.setPrototypeOf(this, new.target.prototype);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for logging/API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
    };
  }
}

/**
 * Authentication/Authorization errors
 */
export class AuthError extends AppError {
  constructor(
    message: string = 'Authentication required',
    code: ErrorCode = ErrorCodes.AUTH_REQUIRED,
    context?: Record<string, unknown>
  ) {
    super(message, code, 401, true, context);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string>;

  constructor(
    message: string = 'Validation failed',
    fields?: Record<string, string>,
    context?: Record<string, unknown>
  ) {
    super(message, ErrorCodes.VALIDATION_FAILED, 422, true, context);
    this.fields = fields;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      fields: this.fields,
    };
  }
}

/**
 * API/Network errors
 */
export class ApiError extends AppError {
  public readonly endpoint?: string;
  public readonly method?: string;

  constructor(
    message: string = 'API request failed',
    code: ErrorCode = ErrorCodes.API_ERROR,
    statusCode: number = 500,
    endpoint?: string,
    method?: string,
    context?: Record<string, unknown>
  ) {
    super(message, code, statusCode, true, context);
    this.endpoint = endpoint;
    this.method = method;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      endpoint: this.endpoint,
      method: this.method,
    };
  }
}

/**
 * Database errors
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed',
    code: ErrorCode = ErrorCodes.DATABASE_ERROR,
    context?: Record<string, unknown>
  ) {
    super(message, code, 500, true, context);
  }
}

/**
 * Business logic errors
 */
export class BusinessError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.BUSINESS_RULE_VIOLATION,
    context?: Record<string, unknown>
  ) {
    super(message, code, 400, true, context);
  }
}

/**
 * Not found errors
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string = 'Resource',
    context?: Record<string, unknown>
  ) {
    super(`${resource} not found`, ErrorCodes.RECORD_NOT_FOUND, 404, true, context);
  }
}

// ============================================================================
// Error Handler Functions
// ============================================================================

/**
 * Check if error is an operational error (expected, handled)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Extract user-friendly error message from any error
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Extract error code from any error
 */
export function getErrorCode(error: unknown): ErrorCode {
  if (error instanceof AppError) {
    return error.code;
  }
  
  return ErrorCodes.UNKNOWN_ERROR;
}

/**
 * Extract HTTP status code from any error
 */
export function getStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  
  if (error instanceof Error) {
    // Try to extract from common error patterns
    const message = error.message.toLowerCase();
    if (message.includes('not found')) return 404;
    if (message.includes('unauthorized') || message.includes('auth')) return 401;
    if (message.includes('forbidden') || message.includes('permission')) return 403;
    if (message.includes('validation') || message.includes('invalid')) return 422;
  }
  
  return 500;
}

/**
 * Convert any error to AppError
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(
      error.message,
      ErrorCodes.UNKNOWN_ERROR,
      getStatusCode(error),
      false,
      { originalError: error.name }
    );
  }
  
  if (typeof error === 'string') {
    return new AppError(error, ErrorCodes.UNKNOWN_ERROR, 500, false);
  }
  
  return new AppError(
    'An unexpected error occurred',
    ErrorCodes.UNKNOWN_ERROR,
    500,
    false,
    { error: String(error) }
  );
}

/**
 * Log error with appropriate level
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const normalizedError = normalizeError(error);
  
  const logData = {
    ...normalizedError.toJSON(),
    ...context,
  };
  
  if (normalizedError.isOperational) {
    // Operational errors are expected, log as warning
    console.warn('[Operational Error]', logData);
  } else {
    // Programming errors or unexpected errors, log as error
    console.error('[Unexpected Error]', logData);
  }
}

/**
 * Handle error and return user-friendly response
 */
export function handleError(error: unknown, context?: Record<string, unknown>): {
  message: string;
  code: ErrorCode;
  statusCode: number;
  fields?: Record<string, string>;
} {
  logError(error, context);
  
  const normalizedError = normalizeError(error);
  
  return {
    message: getUserMessage(error),
    code: normalizedError.code,
    statusCode: normalizedError.statusCode,
    ...(normalizedError instanceof ValidationError && { fields: normalizedError.fields }),
  };
}

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Create authentication error
 */
export function createAuthError(message?: string, context?: Record<string, unknown>): AuthError {
  return new AuthError(message, ErrorCodes.AUTH_REQUIRED, context);
}

/**
 * Create validation error from Zod error
 */
export function createValidationError(
  message: string,
  fields?: Record<string, string>,
  context?: Record<string, unknown>
): ValidationError {
  return new ValidationError(message, fields, context);
}

/**
 * Create API error from fetch response
 */
export async function createApiErrorFromResponse(
  response: Response,
  endpoint: string,
  method: string
): Promise<ApiError> {
  let message = `API request failed: ${response.status} ${response.statusText}`;
  let context: Record<string, unknown> = {};
  
  try {
    const data = await response.json();
    if (data.message) message = data.message;
    if (data.detail) message = data.detail;
    context = data;
  } catch {
    // Response is not JSON, use default message
  }
  
  const code = response.status === 404 ? ErrorCodes.RECORD_NOT_FOUND :
               response.status === 401 ? ErrorCodes.AUTH_REQUIRED :
               response.status === 403 ? ErrorCodes.PERMISSION_DENIED :
               response.status === 422 ? ErrorCodes.VALIDATION_FAILED :
               response.status >= 500 ? ErrorCodes.SERVER_ERROR :
               ErrorCodes.API_ERROR;
  
  return new ApiError(message, code, response.status, endpoint, method, context);
}

/**
 * Create network error
 */
export function createNetworkError(
  endpoint: string,
  method: string,
  originalError?: Error
): ApiError {
  return new ApiError(
    'Network request failed. Please check your internet connection.',
    ErrorCodes.NETWORK_ERROR,
    0,
    endpoint,
    method,
    { originalError: originalError?.message }
  );
}

/**
 * Create not found error
 */
export function createNotFoundError(
  resource: string,
  context?: Record<string, unknown>
): NotFoundError {
  return new NotFoundError(resource, context);
}

/**
 * Create business logic error
 */
export function createBusinessError(
  message: string,
  code?: ErrorCode,
  context?: Record<string, unknown>
): BusinessError {
  return new BusinessError(message, code, context);
}

// ============================================================================
// Error Message Templates
// ============================================================================

export const ErrorMessages = {
  // Authentication
  AUTH_REQUIRED: 'Please sign in to continue',
  AUTH_EXPIRED: 'Your session has expired. Please sign in again',
  PERMISSION_DENIED: 'You do not have permission to perform this action',
  
  // Validation
  REQUIRED_FIELD: (field: string) => `${field} is required`,
  INVALID_FORMAT: (field: string) => `${field} has an invalid format`,
  OUT_OF_RANGE: (field: string, min: number, max: number) => 
    `${field} must be between ${min} and ${max}`,
  
  // API
  NETWORK_ERROR: 'Network error. Please check your internet connection',
  SERVER_ERROR: 'Server error. Please try again later',
  TIMEOUT: 'Request timed out. Please try again',
  
  // Database
  RECORD_NOT_FOUND: (resource: string) => `${resource} not found`,
  DUPLICATE_RECORD: (resource: string) => `${resource} already exists`,
  
  // Generic
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again',
  NOT_IMPLEMENTED: 'This feature is not yet implemented',
} as const;

// ============================================================================
// Retry Logic Helper
// ============================================================================

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  shouldRetry: (error: unknown) => boolean = () => true
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`Retrying (attempt ${attempt + 1}/${maxRetries})...`);
    }
  }
  
  throw lastError;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    // Retry on network errors, timeouts, and 5xx errors
    return error.code === ErrorCodes.NETWORK_ERROR ||
           error.code === ErrorCodes.TIMEOUT_ERROR ||
           error.statusCode >= 500;
  }
  
  return false;
}
