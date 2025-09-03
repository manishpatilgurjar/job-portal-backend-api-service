import { 
  IDatabaseConnection, 
  IDatabaseConfig 
} from '../interfaces/database-config.interface';
import { DatabaseType, ConnectionStatus } from '../enums/database-type.enum';
import { 
  DatabaseConnectionException,
  DatabaseQueryException,
  DatabaseTransactionException 
} from '../exceptions/database.exceptions';

/**
 * Abstract base class for database connections
 * Implements common functionality for all database connection types
 */
export abstract class BaseDatabaseConnection implements IDatabaseConnection {
  protected _status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  protected _connection: any = null;
  protected _transaction: any = null;

  constructor(
    public readonly id: string,
    public readonly type: DatabaseType,
    public readonly config: IDatabaseConfig
  ) {
    this.validateConfig();
  }

  /**
   * Get current connection status
   */
  get status(): string {
    return this._status;
  }

  /**
   * Validate database configuration
   */
  protected validateConfig(): void {
    if (!this.config.host || !this.config.port || !this.config.database) {
      throw new DatabaseConnectionException(
        'Invalid database configuration: missing required fields'
      );
    }
  }

  /**
   * Abstract method to establish connection
   * Must be implemented by concrete connection classes
   */
  abstract connect(): Promise<void>;

  /**
   * Abstract method to close connection
   * Must be implemented by concrete connection classes
   */
  abstract disconnect(): Promise<void>;

  /**
   * Abstract method to get raw connection object
   * Must be implemented by concrete connection classes
   */
  abstract getConnection(): any;

  /**
   * Abstract method to execute query
   * Must be implemented by concrete connection classes
   */
  abstract executeQuery(query: string, params?: any[]): Promise<any>;

  /**
   * Abstract method to begin transaction
   * Must be implemented by concrete connection classes
   */
  abstract beginTransaction(): Promise<any>;

  /**
   * Abstract method to commit transaction
   * Must be implemented by concrete connection classes
   */
  abstract commitTransaction(transaction: any): Promise<void>;

  /**
   * Abstract method to rollback transaction
   * Must be implemented by concrete connection classes
   */
  abstract rollbackTransaction(transaction: any): Promise<void>;

  /**
   * Check if connection is established
   */
  isConnected(): boolean {
    return this._status === ConnectionStatus.CONNECTED && this._connection !== null;
  }

  /**
   * Set connection status
   */
  protected setStatus(status: ConnectionStatus): void {
    this._status = status;
  }

  /**
   * Handle connection errors
   */
  protected handleConnectionError(error: any): never {
    this.setStatus(ConnectionStatus.ERROR);
    throw new DatabaseConnectionException(
      `Connection failed: ${error.message}`,
      { connectionId: this.id, error }
    );
  }

  /**
   * Handle query errors
   */
  protected handleQueryError(error: any, query: string, params?: any[]): never {
    throw new DatabaseQueryException(
      `Query execution failed: ${error.message}`,
      { connectionId: this.id, query, params, error }
    );
  }

  /**
   * Handle transaction errors
   */
  protected handleTransactionError(error: any, operation: string): never {
    throw new DatabaseTransactionException(
      `Transaction ${operation} failed: ${error.message}`,
      { connectionId: this.id, operation, error }
    );
  }

  /**
   * Get connection info for logging
   */
  getConnectionInfo(): object {
    return {
      id: this.id,
      type: this.type,
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      status: this._status,
    };
  }
}
