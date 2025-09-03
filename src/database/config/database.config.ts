import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  IPostgreSQLConfig, 
  IMongoDBConfig, 
  IDatabaseConfig 
} from '../interfaces/database-config.interface';
import { DatabaseType } from '../enums/database-type.enum';

/**
 * Database configuration service
 * Handles loading and validation of database configurations
 */
@Injectable()
export class DatabaseConfig {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get PostgreSQL configuration
   */
  getPostgreSQLConfig(): IPostgreSQLConfig {
    return {
      type: DatabaseType.POSTGRESQL,
      host: this.configService.get<string>('POSTGRES_HOST', 'localhost'),
      port: this.configService.get<number>('POSTGRES_PORT', 5432),
      database: this.configService.get<string>('POSTGRES_DB', 'job_portal'),
      username: this.configService.get<string>('POSTGRES_USER', 'postgres'),
      password: this.configService.get<string>('POSTGRES_PASSWORD', 'password'),
      ssl: this.configService.get<boolean>('POSTGRES_SSL', false),
      schema: this.configService.get<string>('POSTGRES_SCHEMA', 'public'),
      applicationName: this.configService.get<string>('POSTGRES_APP_NAME', 'job-portal-backend'),
      connectionTimeout: this.configService.get<number>('POSTGRES_CONNECTION_TIMEOUT', 30000),
      acquireTimeout: this.configService.get<number>('POSTGRES_ACQUIRE_TIMEOUT', 60000),
      timeout: this.configService.get<number>('POSTGRES_TIMEOUT', 30000),
      max: this.configService.get<number>('POSTGRES_MAX_CONNECTIONS', 20),
      idleTimeoutMillis: this.configService.get<number>('POSTGRES_IDLE_TIMEOUT', 30000),
      connectionTimeoutMillis: this.configService.get<number>('POSTGRES_CONNECTION_TIMEOUT_MS', 30000),
      pool: {
        min: this.configService.get<number>('POSTGRES_POOL_MIN', 2),
        max: this.configService.get<number>('POSTGRES_POOL_MAX', 20),
        idle: this.configService.get<number>('POSTGRES_POOL_IDLE', 10000),
      },
    };
  }

  /**
   * Get MongoDB configuration
   */
  getMongoDBConfig(): IMongoDBConfig {
    return {
      type: DatabaseType.MONGODB,
      host: this.configService.get<string>('MONGO_HOST', 'localhost'),
      port: this.configService.get<number>('MONGO_PORT', 27017),
      database: this.configService.get<string>('MONGO_DB', 'job_portal'),
      username: this.configService.get<string>('MONGO_USER'),
      password: this.configService.get<string>('MONGO_PASSWORD'),
      ssl: this.configService.get<boolean>('MONGO_SSL', false),
      authSource: this.configService.get<string>('MONGO_AUTH_SOURCE', 'admin'),
      authMechanism: this.configService.get<string>('MONGO_AUTH_MECHANISM', 'SCRAM-SHA-1'),
      replicaSet: this.configService.get<string>('MONGO_REPLICA_SET'),
      readPreference: this.configService.get<string>('MONGO_READ_PREFERENCE', 'primary'),
      maxPoolSize: this.configService.get<number>('MONGO_MAX_POOL_SIZE', 10),
      minPoolSize: this.configService.get<number>('MONGO_MIN_POOL_SIZE', 2),
      maxIdleTimeMS: this.configService.get<number>('MONGO_MAX_IDLE_TIME_MS', 30000),
      serverSelectionTimeoutMS: this.configService.get<number>('MONGO_SERVER_SELECTION_TIMEOUT_MS', 5000),
      socketTimeoutMS: this.configService.get<number>('MONGO_SOCKET_TIMEOUT_MS', 45000),
      connectTimeoutMS: this.configService.get<number>('MONGO_CONNECT_TIMEOUT_MS', 10000),
      connectionTimeout: this.configService.get<number>('MONGO_CONNECTION_TIMEOUT', 30000),
      acquireTimeout: this.configService.get<number>('MONGO_ACQUIRE_TIMEOUT', 60000),
      timeout: this.configService.get<number>('MONGO_TIMEOUT', 30000),
      pool: {
        min: this.configService.get<number>('MONGO_POOL_MIN', 2),
        max: this.configService.get<number>('MONGO_POOL_MAX', 10),
        idle: this.configService.get<number>('MONGO_POOL_IDLE', 10000),
      },
    };
  }

  /**
   * Get all database configurations
   */
  getAllConfigs(): { postgresql: IPostgreSQLConfig; mongodb: IMongoDBConfig } {
    return {
      postgresql: this.getPostgreSQLConfig(),
      mongodb: this.getMongoDBConfig(),
    };
  }

  /**
   * Validate database configuration
   */
  validateConfig(config: IDatabaseConfig): boolean {
    if (!config.host || !config.port || !config.database) {
      return false;
    }
    
    if (config.port < 1 || config.port > 65535) {
      return false;
    }

    return true;
  }
}
