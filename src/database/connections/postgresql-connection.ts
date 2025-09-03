import { Injectable } from '@nestjs/common';
import * as Knex from 'knex';
import { BaseDatabaseConnection } from './base-connection.abstract';
import { IPostgreSQLConfig } from '../interfaces/database-config.interface';
import { DatabaseType, ConnectionStatus } from '../enums/database-type.enum';
import { 
  DatabaseConnectionException,
  DatabaseQueryException,
  DatabaseTransactionException 
} from '../exceptions/database.exceptions';

/**
 * PostgreSQL database connection implementation using Knex
 */
@Injectable()
export class PostgreSQLConnection extends BaseDatabaseConnection {
  private knex: Knex.Knex;

  constructor(id: string, config: IPostgreSQLConfig) {
    super(id, DatabaseType.POSTGRESQL, config);
  }

  /**
   * Establish PostgreSQL connection using Knex
   */
  async connect(): Promise<void> {
    try {
      this.setStatus(ConnectionStatus.CONNECTING);

      const knexConfig: Knex.Config = {
        client: 'pg',
        connection: {
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.username,
          password: this.config.password,
          ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
          application_name: this.config.applicationName,
        },
        pool: {
          min: this.config.pool?.min || 2,
          max: this.config.pool?.max || 20,
          idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
          acquireTimeoutMillis: this.config.acquireTimeout || 60000,
        },
        acquireConnectionTimeout: this.config.connectionTimeout || 30000,
        migrations: {
          directory: './src/database/migrations',
          tableName: 'knex_migrations',
        },
        seeds: {
          directory: './src/database/seeds',
        },
        debug: process.env.NODE_ENV === 'development',
      };

      this.knex = Knex(knexConfig);

      // Test the connection
      await this.knex.raw('SELECT 1');
      
      this._connection = this.knex;
      this.setStatus(ConnectionStatus.CONNECTED);

    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  /**
   * Close PostgreSQL connection
   */
  async disconnect(): Promise<void> {
    try {
      if (this.knex) {
        await this.knex.destroy();
        this.knex = null;
        this._connection = null;
        this.setStatus(ConnectionStatus.DISCONNECTED);
      }
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  /**
   * Get Knex instance
   */
  getConnection(): Knex.Knex {
    if (!this.isConnected()) {
      throw new DatabaseConnectionException('Connection not established');
    }
    return this.knex;
  }

  /**
   * Execute raw SQL query
   */
  async executeQuery(query: string, params?: any[]): Promise<any> {
    try {
      if (!this.isConnected()) {
        throw new DatabaseConnectionException('Connection not established');
      }

      const result = await this.knex.raw(query, params);
      return result.rows || result;
    } catch (error) {
      this.handleQueryError(error, query, params);
    }
  }

  /**
   * Begin database transaction
   */
  async beginTransaction(): Promise<Knex.Transaction> {
    try {
      if (!this.isConnected()) {
        throw new DatabaseConnectionException('Connection not established');
      }

      const transaction = await this.knex.transaction();
      this._transaction = transaction;
      return transaction;
    } catch (error) {
      this.handleTransactionError(error, 'begin');
    }
  }

  /**
   * Commit transaction
   */
  async commitTransaction(transaction: Knex.Transaction): Promise<void> {
    try {
      if (!transaction) {
        throw new DatabaseTransactionException('Transaction not provided');
      }

      await transaction.commit();
      this._transaction = null;
    } catch (error) {
      this.handleTransactionError(error, 'commit');
    }
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(transaction: Knex.Transaction): Promise<void> {
    try {
      if (!transaction) {
        throw new DatabaseTransactionException('Transaction not provided');
      }

      await transaction.rollback();
      this._transaction = null;
    } catch (error) {
      this.handleTransactionError(error, 'rollback');
    }
  }

  /**
   * Get Knex query builder for a table
   */
  table(tableName: string): Knex.QueryBuilder {
    if (!this.isConnected()) {
      throw new DatabaseConnectionException('Connection not established');
    }
    return this.knex(tableName);
  }

  /**
   * Get Knex schema builder
   */
  schema(): Knex.SchemaBuilder {
    if (!this.isConnected()) {
      throw new DatabaseConnectionException('Connection not established');
    }
    return this.knex.schema;
  }

  /**
   * Run migrations
   */
  async migrate(): Promise<void> {
    try {
      if (!this.isConnected()) {
        throw new DatabaseConnectionException('Connection not established');
      }

      await this.knex.migrate.latest();
    } catch (error) {
      this.handleTransactionError(error, 'migrate');
    }
  }

  /**
   * Rollback migrations
   */
  async rollback(): Promise<void> {
    try {
      if (!this.isConnected()) {
        throw new DatabaseConnectionException('Connection not established');
      }

      await this.knex.migrate.rollback();
    } catch (error) {
      this.handleTransactionError(error, 'rollback migration');
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<any> {
    try {
      if (!this.isConnected()) {
        throw new DatabaseConnectionException('Connection not established');
      }

      return await this.knex.migrate.status();
    } catch (error) {
      this.handleQueryError(error, 'SELECT * FROM knex_migrations');
    }
  }
}
