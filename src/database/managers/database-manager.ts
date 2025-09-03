import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { 
  IDatabaseManager, 
  IDatabaseConnection, 
  IDatabaseConfig 
} from '../interfaces/database-config.interface';
import { DatabaseType } from '../enums/database-type.enum';
import { PostgreSQLConnection } from '../connections/postgresql-connection';
import { MongoDBConnection } from '../connections/mongodb-connection';
import { 
  DatabaseConnectionNotFoundException,
  DatabaseConnectionAlreadyExistsException,
  DatabaseConnectionException 
} from '../exceptions/database.exceptions';

/**
 * Database manager service
 * Manages multiple database connections with proper lifecycle management
 */
@Injectable()
export class DatabaseManager implements IDatabaseManager, OnModuleInit, OnModuleDestroy {
  public readonly connections: Map<string, IDatabaseConnection> = new Map();

  /**
   * Initialize all database connections on module init
   */
  async onModuleInit(): Promise<void> {
    // This will be called by the DatabaseModule
    // Individual connections will be added via addConnection method
  }

  /**
   * Clean up all database connections on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    await this.disconnectAll();
  }

  /**
   * Add a new database connection
   */
  async addConnection(id: string, config: IDatabaseConfig): Promise<IDatabaseConnection> {
    if (this.connections.has(id)) {
      throw new DatabaseConnectionAlreadyExistsException(id);
    }

    let connection: IDatabaseConnection;

    try {
      switch (config.type) {
        case DatabaseType.POSTGRESQL:
          connection = new PostgreSQLConnection(id, config as any);
          break;
        case DatabaseType.MONGODB:
          connection = new MongoDBConnection(id, config as any);
          break;
        default:
          throw new DatabaseConnectionException(`Unsupported database type: ${config.type}`);
      }

      await connection.connect();
      this.connections.set(id, connection);
      
      return connection;
    } catch (error) {
      throw new DatabaseConnectionException(
        `Failed to add connection '${id}': ${error.message}`,
        { connectionId: id, config, error }
      );
    }
  }

  /**
   * Get a database connection by ID
   */
  getConnection(id: string): IDatabaseConnection | undefined {
    return this.connections.get(id);
  }

  /**
   * Remove a database connection
   */
  async removeConnection(id: string): Promise<void> {
    const connection = this.connections.get(id);
    
    if (!connection) {
      throw new DatabaseConnectionNotFoundException(id);
    }

    try {
      await connection.disconnect();
      this.connections.delete(id);
    } catch (error) {
      throw new DatabaseConnectionException(
        `Failed to remove connection '${id}': ${error.message}`,
        { connectionId: id, error }
      );
    }
  }

  /**
   * Connect all database connections
   */
  async connectAll(): Promise<void> {
    const connectionPromises = Array.from(this.connections.values()).map(
      connection => connection.connect()
    );

    try {
      await Promise.all(connectionPromises);
    } catch (error) {
      throw new DatabaseConnectionException(
        `Failed to connect all databases: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * Disconnect all database connections
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.values()).map(
      connection => connection.disconnect().catch(error => {
        console.error(`Failed to disconnect connection: ${error.message}`);
      })
    );

    await Promise.all(disconnectPromises);
    this.connections.clear();
  }

  /**
   * Get connection status by ID
   */
  getConnectionStatus(id: string): string {
    const connection = this.connections.get(id);
    
    if (!connection) {
      throw new DatabaseConnectionNotFoundException(id);
    }

    return connection.status;
  }

  /**
   * Check if all connections are healthy
   */
  isHealthy(): boolean {
    return Array.from(this.connections.values()).every(
      connection => connection.isConnected()
    );
  }

  /**
   * Get all connection statuses
   */
  getAllConnectionStatuses(): Record<string, string> {
    const statuses: Record<string, string> = {};
    
    for (const [id, connection] of this.connections) {
      statuses[id] = connection.status;
    }
    
    return statuses;
  }

  /**
   * Get connection info for all connections
   */
  getAllConnectionInfo(): Record<string, any> {
    const info: Record<string, any> = {};
    
    for (const [id, connection] of this.connections) {
      info[id] = connection.getConnectionInfo();
    }
    
    return info;
  }

  /**
   * Execute query on specific connection
   */
  async executeQuery(connectionId: string, query: string, params?: any[]): Promise<any> {
    const connection = this.getConnection(connectionId);
    
    if (!connection) {
      throw new DatabaseConnectionNotFoundException(connectionId);
    }

    return await connection.executeQuery(query, params);
  }

  /**
   * Begin transaction on specific connection
   */
  async beginTransaction(connectionId: string): Promise<any> {
    const connection = this.getConnection(connectionId);
    
    if (!connection) {
      throw new DatabaseConnectionNotFoundException(connectionId);
    }

    return await connection.beginTransaction();
  }

  /**
   * Commit transaction on specific connection
   */
  async commitTransaction(connectionId: string, transaction: any): Promise<void> {
    const connection = this.getConnection(connectionId);
    
    if (!connection) {
      throw new DatabaseConnectionNotFoundException(connectionId);
    }

    return await connection.commitTransaction(transaction);
  }

  /**
   * Rollback transaction on specific connection
   */
  async rollbackTransaction(connectionId: string, transaction: any): Promise<void> {
    const connection = this.getConnection(connectionId);
    
    if (!connection) {
      throw new DatabaseConnectionNotFoundException(connectionId);
    }

    return await connection.rollbackTransaction(transaction);
  }

  /**
   * Get PostgreSQL connection (convenience method)
   */
  getPostgreSQLConnection(connectionId: string = 'postgresql'): PostgreSQLConnection {
    const connection = this.getConnection(connectionId);
    
    if (!connection || connection.type !== DatabaseType.POSTGRESQL) {
      throw new DatabaseConnectionNotFoundException(connectionId);
    }

    return connection as unknown as PostgreSQLConnection;
  }

  /**
   * Get MongoDB connection (convenience method)
   */
  getMongoDBConnection(connectionId: string = 'mongodb'): MongoDBConnection {
    const connection = this.getConnection(connectionId);
    
    if (!connection || connection.type !== DatabaseType.MONGODB) {
      throw new DatabaseConnectionNotFoundException(connectionId);
    }

    return connection as unknown as MongoDBConnection;
  }
}
