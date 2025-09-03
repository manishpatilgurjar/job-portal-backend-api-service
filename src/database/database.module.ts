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
        console.log('🚀 Initializing Database Connections...');
        console.log('=====================================');

        try {
          // Initialize PostgreSQL connection
          console.log('🐘 Connecting to PostgreSQL...');
          const postgresConfig = databaseConfig.getPostgreSQLConfig();
          await databaseManager.addConnection('postgresql', postgresConfig);
          console.log('✅ PostgreSQL connection established successfully!');

          // Initialize MongoDB connection
          console.log('🍃 Connecting to MongoDB...');
          const mongoConfig = databaseConfig.getMongoDBConfig();
          await databaseManager.addConnection('mongodb', mongoConfig);
          console.log('✅ MongoDB connection established successfully!');

          console.log('=====================================');
          console.log('🎉 All database connections are ready!');
          console.log('=====================================');

          return databaseManager;
        } catch (error) {
          console.error('❌ Database initialization failed:', error.message);
          throw error;
        }
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