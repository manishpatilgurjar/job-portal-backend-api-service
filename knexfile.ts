import { ConfigService } from '@nestjs/config';
import { DatabaseConfig } from './src/database/config/database.config';

// Load environment variables
require('dotenv').config();

const configService = new ConfigService();
const databaseConfig = new DatabaseConfig(configService);

const postgresConfig = databaseConfig.getPostgreSQLConfig();

/**
 * Knex configuration for PostgreSQL
 * This file is used by Knex CLI for migrations and seeds
 */
module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: postgresConfig.host,
      port: postgresConfig.port,
      database: postgresConfig.database,
      user: postgresConfig.username,
      password: postgresConfig.password,
      ssl: postgresConfig.ssl ? { rejectUnauthorized: false } : false,
      application_name: postgresConfig.applicationName,
    },
    pool: {
      min: postgresConfig.pool?.min || 2,
      max: postgresConfig.pool?.max || 20,
      idleTimeoutMillis: postgresConfig.idleTimeoutMillis || 30000,
      acquireTimeoutMillis: postgresConfig.acquireTimeout || 60000,
    },
    acquireConnectionTimeout: postgresConfig.connectionTimeout || 30000,
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts',
    },
    debug: process.env.NODE_ENV === 'development',
  },

  staging: {
    client: 'pg',
    connection: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'job_portal_staging',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'password',
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000,
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts',
    },
  },

  production: {
    client: 'pg',
    connection: {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 2,
      max: 20,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000,
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts',
    },
  },
};
