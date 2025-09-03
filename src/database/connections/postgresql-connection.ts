import { Injectable } from '@nestjs/common';
import knex, { Knex } from 'knex';
import { BaseDatabaseConnection } from './base-connection.abstract';
import type { IPostgreSQLConfig } from '../interfaces/database-config.interface';
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
  private knex: Knex;

  constructor(id: string, config: IPostgreSQLConfig) {
    super(id, DatabaseType.POSTGRESQL, config);
  }

  /**
   * Establish PostgreSQL connection using Knex
   */
  async connect(): Promise<void> {
    try {
      this.setStatus(ConnectionStatus.CONNECTING);
      console.log(`   📡 Connecting to PostgreSQL at ${this.config.host}:${this.config.port}/${this.config.database}...`);

      const knexConfig: Knex.Config = {
        client: 'pg',
        connection: {
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.username,
          password: this.config.password,
        },
        migrations: {
          directory: './src/database/migrations',
          tableName: 'knex_migrations',
        },
        seeds: {
          directory: './src/database/seeds',
        },
      };

      this.knex = knex(knexConfig);

      // Test the connection
      await this.knex.raw('SELECT 1');
      
      this._connection = this.knex;
      this.setStatus(ConnectionStatus.CONNECTED);
      console.log(`   ✅ PostgreSQL connected successfully!`);

    } catch (error) {
      console.error(`   ❌ PostgreSQL connection failed: ${error.message}`);
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
        this.knex = undefined as any;
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
  getConnection(): Knex {
    if (!this.isConnected()) {
      throw new DatabaseConnectionException('Connection not established');
    }
    return this.knex;
  }

  /**
   * Execute raw SQL query
   */
  async executeQuery(query: string | object, params?: any[]): Promise<any> {
    try {
      if (!this.isConnected()) {
        throw new DatabaseConnectionException('Connection not established');
      }

      // PostgreSQL only supports string queries
      if (typeof query !== 'string') {
        throw new DatabaseQueryException('PostgreSQL only supports string queries');
      }

      const result = await this.knex.raw(query, params || []);
      return result.rows || result;
    } catch (error) {
      this.handleQueryError(error, query as string, params);
    }
  }

  /**
   * Begin database transaction
   */
  async beginTransaction(): Promise<any> {
    try {
      if (!this.isConnected()) {
        throw new DatabaseConnectionException('Connection not established');
      }

      return new Promise((resolve, reject) => {
        this.knex.transaction((trx) => {
          this._transaction = trx;
          resolve(trx);
        }).catch(reject);
      });
    } catch (error) {
      this.handleTransactionError(error, 'begin');
    }
  }

  /**
   * Commit transaction
   */
  async commitTransaction(transaction: any): Promise<void> {
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
  async rollbackTransaction(transaction: any): Promise<void> {
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
  table(tableName: string): any {
    if (!this.isConnected()) {
      throw new DatabaseConnectionException('Connection not established');
    }
    return this.knex(tableName);
  }

  /**
   * Get Knex schema builder
   */
  schema(): any {
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
