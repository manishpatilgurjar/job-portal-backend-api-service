/**
 * Base database exception class
 */
export abstract class DatabaseException extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string, public readonly context?: any) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Connection exception
 */
export class DatabaseConnectionException extends DatabaseException {
  readonly code = 'DB_CONNECTION_ERROR';
  readonly statusCode = 500;

  constructor(message: string, context?: any) {
    super(`Database connection failed: ${message}`, context);
  }
}

/**
 * Configuration exception
 */
export class DatabaseConfigException extends DatabaseException {
  readonly code = 'DB_CONFIG_ERROR';
  readonly statusCode = 400;

  constructor(message: string, context?: any) {
    super(`Database configuration error: ${message}`, context);
  }
}

/**
 * Query execution exception
 */
export class DatabaseQueryException extends DatabaseException {
  readonly code = 'DB_QUERY_ERROR';
  readonly statusCode = 500;

  constructor(message: string, context?: any) {
    super(`Database query failed: ${message}`, context);
  }
}

/**
 * Migration exception
 */
export class DatabaseMigrationException extends DatabaseException {
  readonly code = 'DB_MIGRATION_ERROR';
  readonly statusCode = 500;

  constructor(message: string, context?: any) {
    super(`Database migration failed: ${message}`, context);
  }
}

/**
 * Transaction exception
 */
export class DatabaseTransactionException extends DatabaseException {
  readonly code = 'DB_TRANSACTION_ERROR';
  readonly statusCode = 500;

  constructor(message: string, context?: any) {
    super(`Database transaction failed: ${message}`, context);
  }
}

/**
 * Connection not found exception
 */
export class DatabaseConnectionNotFoundException extends DatabaseException {
  readonly code = 'DB_CONNECTION_NOT_FOUND';
  readonly statusCode = 404;

  constructor(connectionId: string) {
    super(`Database connection '${connectionId}' not found`);
  }
}

/**
 * Connection already exists exception
 */
export class DatabaseConnectionAlreadyExistsException extends DatabaseException {
  readonly code = 'DB_CONNECTION_ALREADY_EXISTS';
  readonly statusCode = 409;

  constructor(connectionId: string) {
    super(`Database connection '${connectionId}' already exists`);
  }
}
