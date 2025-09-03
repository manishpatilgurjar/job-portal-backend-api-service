/**
 * Database type enumeration
 * Defines the supported database types in the application
 */
export enum DatabaseType {
  POSTGRESQL = 'postgresql',
  MONGODB = 'mongodb',
}

/**
 * Connection status enumeration
 * Tracks the status of database connections
 */
export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ERROR = 'error',
}

/**
 * Migration status enumeration
 * Tracks the status of database migrations
 */
export enum MigrationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
}
