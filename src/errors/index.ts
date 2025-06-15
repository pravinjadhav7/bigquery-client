export enum ErrorType {
  QUERY_ERROR = 'QUERY_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CACHE_ERROR = 'CACHE_ERROR'
}

export class BigQueryError extends Error {
  constructor(
    message: string,
    public code: ErrorType,
    public details?: any
  ) {
    super(message);
    this.name = 'BigQueryError';
  }
}

export class ValidationError extends BigQueryError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.VALIDATION_ERROR, details);
    this.name = 'ValidationError';
  }
}

export class ConnectionError extends BigQueryError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.CONNECTION_ERROR, details);
    this.name = 'ConnectionError';
  }
}

export class TimeoutError extends BigQueryError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.TIMEOUT_ERROR, details);
    this.name = 'TimeoutError';
  }
}
