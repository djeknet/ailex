// Error codes for AI service errors
export enum AIErrorCode {
  EMPTY_RESPONSE = 'EMPTY_RESPONSE',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  AUTH_ERROR = 'AUTH_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN'
}

// Custom error class for AI service errors
export class AIServiceError extends Error {
  constructor(
    public code: AIErrorCode,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// Helper function to detect error type from error object
export function detectErrorType(error: unknown): AIErrorCode {
  if (error instanceof AIServiceError) {
    return error.code;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  // Check for specific error patterns (language-independent)
  if (errorString.includes('failed to fetch') || 
      errorString.includes('err_connection_refused') ||
      errorString.includes('network error') ||
      errorString.includes('econnrefused')) {
    return AIErrorCode.CONNECTION_FAILED;
  }

  if (errorString.includes('timeout') || 
      errorString.includes('timed out')) {
    return AIErrorCode.TIMEOUT;
  }

  if (errorString.includes('401') || 
      errorString.includes('403') ||
      errorString.includes('unauthorized') ||
      errorString.includes('forbidden')) {
    return AIErrorCode.AUTH_ERROR;
  }

  if (errorString.includes('429') || 
      errorString.includes('rate limit') ||
      errorString.includes('too many requests')) {
    return AIErrorCode.RATE_LIMIT;
  }

  if (errorString.includes('500') || 
      errorString.includes('502') || 
      errorString.includes('503') ||
      errorString.includes('504') ||
      errorString.includes('internal server error') ||
      errorString.includes('bad gateway') ||
      errorString.includes('service unavailable')) {
    return AIErrorCode.SERVER_ERROR;
  }

  return AIErrorCode.UNKNOWN;
}











