import { Injectable } from '@nestjs/common';
import { Connection, connect, Mongoose, ClientSession } from 'mongoose';
import { BaseDatabaseConnection } from './base-connection.abstract';
import type { IMongoDBConfig } from '../interfaces/database-config.interface';
import { DatabaseType, ConnectionStatus } from '../enums/database-type.enum';
import { 
  DatabaseConnectionException,
  DatabaseQueryException,
  DatabaseTransactionException 
} from '../exceptions/database.exceptions';

/**
 * MongoDB database connection implementation using Mongoose
 */
@Injectable()
export class MongoDBConnection extends BaseDatabaseConnection {
  private mongoose: Mongoose | null = null;
  private connection: Connection | null = null;

  constructor(id: string, config: IMongoDBConfig) {
    super(id, DatabaseType.MONGODB, config as any);
  }

  /**
   * Establish MongoDB connection using Mongoose
   */
  async connect(): Promise<void> {
    try {
      this.setStatus(ConnectionStatus.CONNECTING);

      const connectionString = this.buildConnectionString();
      const mongoConfig = this.config as IMongoDBConfig;
      
      const options = {
        maxPoolSize: mongoConfig.maxPoolSize || 10,
        minPoolSize: mongoConfig.minPoolSize || 2,
        maxIdleTimeMS: mongoConfig.maxIdleTimeMS || 30000,
        serverSelectionTimeoutMS: mongoConfig.serverSelectionTimeoutMS || 5000,
        socketTimeoutMS: mongoConfig.socketTimeoutMS || 45000,
        connectTimeoutMS: mongoConfig.connectTimeoutMS || 10000,
        ssl: this.config.ssl,
        authSource: mongoConfig.authSource,
        authMechanism: mongoConfig.authMechanism as any,
        replicaSet: mongoConfig.replicaSet,
        readPreference: mongoConfig.readPreference as any,
        retryWrites: true,
        retryReads: true,
      };

      this.mongoose = await connect(connectionString, options);
      this.connection = this.mongoose.connection;
      this._connection = this.connection;
      this.setStatus(ConnectionStatus.CONNECTED);

    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  /**
   * Close MongoDB connection
   */
  async disconnect(): Promise<void> {
    try {
      if (this.mongoose) {
        await this.mongoose.disconnect();
        this.mongoose = null;
        this.connection = null;
        this._connection = null;
        this.setStatus(ConnectionStatus.DISCONNECTED);
      }
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  /**
   * Get Mongoose connection instance
   */
  getConnection(): Connection {
    if (!this.isConnected() || !this.connection) {
      throw new DatabaseConnectionException('Connection not established');
    }
    return this.connection;
  }

  /**
   * Execute MongoDB command using Mongoose
   */
  async executeQuery(query: string | object, options?: any): Promise<any> {
    try {
      if (!this.isConnected() || !this.connection) {
        throw new DatabaseConnectionException('Connection not established');
      }

      const connection = this.connection;
      if (!connection.db) {
        throw new DatabaseConnectionException('Database not available');
      }
      
      if (typeof query === 'string') {
        // Parse JSON string command
        const command = JSON.parse(query);
        return await connection.db.command(command, options);
      } else {
        // Direct object command
        return await connection.db.command(query, options);
      }
    } catch (error) {
      this.handleQueryError(error, typeof query === 'string' ? query : JSON.stringify(query));
    }
  }

  /**
   * Begin database transaction (MongoDB 4.0+)
   */
  async beginTransaction(): Promise<ClientSession> {
    try {
      if (!this.isConnected()) {
        throw new DatabaseConnectionException('Connection not established');
      }

      const session = await this.connection!.startSession();
      session.startTransaction();
      this._transaction = session;
      return session;
    } catch (error) {
      this.handleTransactionError(error, 'begin');
    }
  }

  /**
   * Commit transaction
   */
  async commitTransaction(session: ClientSession): Promise<void> {
    try {
      if (!session) {
        throw new DatabaseTransactionException('Session not provided');
      }

      await session.commitTransaction();
      await session.endSession();
      this._transaction = null;
    } catch (error) {
      this.handleTransactionError(error, 'commit');
    }
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(session: ClientSession): Promise<void> {
    try {
      if (!session) {
        throw new DatabaseTransactionException('Session not provided');
      }

      await session.abortTransaction();
      await session.endSession();
      this._transaction = null;
    } catch (error) {
      this.handleTransactionError(error, 'rollback');
    }
  }

  /**
   * Get MongoDB collection using Mongoose
   */
  collection(collectionName: string): any {
    if (!this.isConnected() || !this.connection) {
      throw new DatabaseConnectionException('Connection not established');
    }
    const connection = this.connection;
    if (!connection.db) {
      throw new DatabaseConnectionException('Database not available');
    }
    return connection.db.collection(collectionName);
  }

  /**
   * Create collection
   */
  async createCollection(name: string, options?: any): Promise<any> {
    try {
      if (!this.isConnected() || !this.connection) {
        throw new DatabaseConnectionException('Connection not established');
      }

      const connection = this.connection;
      if (!connection.db) {
        throw new DatabaseConnectionException('Database not available');
      }
      return await connection.db.createCollection(name, options);
    } catch (error) {
      this.handleQueryError(error, `CREATE COLLECTION ${name}`);
    }
  }

  /**
   * Drop collection
   */
  async dropCollection(name: string): Promise<boolean> {
    try {
      if (!this.isConnected() || !this.connection) {
        throw new DatabaseConnectionException('Connection not established');
      }

      const connection = this.connection;
      if (!connection.db) {
        throw new DatabaseConnectionException('Database not available');
      }
      return await connection.db.collection(name).drop();
    } catch (error) {
      this.handleQueryError(error, `DROP COLLECTION ${name}`);
    }
  }

  /**
   * List collections
   */
  async listCollections(): Promise<any[]> {
    try {
      if (!this.isConnected() || !this.connection) {
        throw new DatabaseConnectionException('Connection not established');
      }

      const connection = this.connection;
      if (!connection.db) {
        throw new DatabaseConnectionException('Database not available');
      }
      return await connection.db.listCollections().toArray();
    } catch (error) {
      this.handleQueryError(error, 'LIST COLLECTIONS');
    }
  }

  /**
   * Create index
   */
  async createIndex(collectionName: string, indexSpec: any, options?: any): Promise<string> {
    try {
      if (!this.isConnected() || !this.connection) {
        throw new DatabaseConnectionException('Connection not established');
      }

      const connection = this.connection;
      if (!connection.db) {
        throw new DatabaseConnectionException('Database not available');
      }
      return await connection.db.collection(collectionName).createIndex(indexSpec, options);
    } catch (error) {
      this.handleQueryError(error, `CREATE INDEX on ${collectionName}`);
    }
  }

  /**
   * Build MongoDB connection string
   */
  private buildConnectionString(): string {
    const { host, port, database, username, password, ssl } = this.config;
    
    let connectionString = 'mongodb://';
    
    if (username && password) {
      connectionString += `${username}:${password}@`;
    }
    
    connectionString += `${host}:${port}/${database}`;
    
    if (ssl) {
      connectionString += '?ssl=true';
    }
    
    return connectionString;
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<any> {
    try {
      if (!this.isConnected() || !this.connection) {
        throw new DatabaseConnectionException('Connection not established');
      }

      const connection = this.connection;
      if (!connection.db) {
        throw new DatabaseConnectionException('Database not available');
      }
      return await connection.db.stats();
    } catch (error) {
      this.handleQueryError(error, 'db.stats()');
    }
  }

  /**
   * Get Mongoose instance
   */
  getMongoose(): Mongoose {
    if (!this.isConnected() || !this.mongoose) {
      throw new DatabaseConnectionException('Connection not established');
    }
    return this.mongoose;
  }

  /**
   * Get Mongoose model
   */
  getModel<T>(modelName: string, schema?: any) {
    if (!this.isConnected() || !this.mongoose) {
      throw new DatabaseConnectionException('Connection not established');
    }
    
    if (schema) {
      return this.mongoose.model<T>(modelName, schema);
    }
    
    return this.mongoose.model<T>(modelName);
  }
}