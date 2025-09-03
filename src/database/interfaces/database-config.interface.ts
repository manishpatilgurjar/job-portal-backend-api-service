import { DatabaseType } from '../enums/database-type.enum';

/**
 * Base database configuration interface
 * Defines the common properties for all database configurations
 */
export interface IDatabaseConfig {
  readonly type: DatabaseType;
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly username?: string;
  readonly password?: string;
  readonly ssl?: boolean;
  readonly connectionTimeout?: number;
  readonly acquireTimeout?: number;
  readonly timeout?: number;
  readonly pool?: {
    min?: number;
    max?: number;
    idle?: number;
  };
}

/**
 * PostgreSQL specific configuration interface
 */
export interface IPostgreSQLConfig extends IDatabaseConfig {
  readonly type: DatabaseType.POSTGRESQL;
  readonly schema?: string;
  readonly applicationName?: string;
  readonly max?: number;
  readonly idleTimeoutMillis?: number;
  readonly connectionTimeoutMillis?: number;
}

/**
 * MongoDB specific configuration interface
 */
export interface IMongoDBConfig extends IDatabaseConfig {
  readonly type: DatabaseType.MONGODB;
  readonly connectionString?: string; // MongoDB connection string
  readonly authSource?: string;
  readonly authMechanism?: string;
  readonly replicaSet?: string;
  readonly readPreference?: string;
  readonly maxPoolSize?: number;
  readonly minPoolSize?: number;
  readonly maxIdleTimeMS?: number;
  readonly serverSelectionTimeoutMS?: number;
  readonly socketTimeoutMS?: number;
  readonly connectTimeoutMS?: number;
}

/**
 * Database connection interface
 * Defines the contract for database connections
 */
export interface IDatabaseConnection {
  readonly id: string;
  readonly type: DatabaseType;
  readonly config: IDatabaseConfig;
  readonly status: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnection(): any;
  executeQuery(query: string | object, params?: any[]): Promise<any>;
  beginTransaction(): Promise<any>;
  commitTransaction(transaction: any): Promise<void>;
  rollbackTransaction(transaction: any): Promise<void>;
  getConnectionInfo(): object;
}

/**
 * Database manager interface
 * Defines the contract for database managers
 */
export interface IDatabaseManager {
  readonly connections: Map<string, IDatabaseConnection>;
  addConnection(id: string, config: IDatabaseConfig): Promise<IDatabaseConnection>;
  getConnection(id: string): IDatabaseConnection | undefined;
  removeConnection(id: string): Promise<void>;
  connectAll(): Promise<void>;
  disconnectAll(): Promise<void>;
  getConnectionStatus(id: string): string;
  isHealthy(): boolean;
}
