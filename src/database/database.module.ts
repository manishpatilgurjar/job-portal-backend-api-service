import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseManager } from './managers/database-manager';
import { DatabaseConfig } from './config/database.config';

/**
 * Global database module
 * Provides database connections and configuration
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    DatabaseConfig,
    DatabaseManager,
    {
      provide: 'DATABASE_INITIALIZER',
      useFactory: async (databaseManager: DatabaseManager, databaseConfig: DatabaseConfig) => {
        // Initialize PostgreSQL connection
        const postgresConfig = databaseConfig.getPostgreSQLConfig();
        await databaseManager.addConnection('postgresql', postgresConfig);

        // Initialize MongoDB connection
        const mongoConfig = databaseConfig.getMongoDBConfig();
        await databaseManager.addConnection('mongodb', mongoConfig);

        return databaseManager;
      },
      inject: [DatabaseManager, DatabaseConfig],
    },
  ],
  exports: [
    DatabaseManager,
    DatabaseConfig,
    'DATABASE_INITIALIZER',
  ],
})
export class DatabaseModule {}