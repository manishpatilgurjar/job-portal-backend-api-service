import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseManager } from './managers/database-manager';
import { DatabaseConfig } from './config/database.config';
import { MongoDBService } from './services/mongodb.service';
import { UserHrDataService } from './services/user-hr-data.service';
import { winstonConfig } from '../common/logger/winston.config';

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
    MongoDBService,
    UserHrDataService,
    {
      provide: 'DATABASE_INITIALIZER',
      useFactory: async (databaseManager: DatabaseManager, databaseConfig: DatabaseConfig) => {
        winstonConfig.log('🚀 Initializing Database Connections...', 'Database');
        winstonConfig.log('=====================================', 'Database');

        try {
          // Initialize PostgreSQL connection
          winstonConfig.log('🐘 Connecting to PostgreSQL...', 'Database');
          const postgresConfig = databaseConfig.getPostgreSQLConfig();
          await databaseManager.addConnection('postgresql', postgresConfig);
          winstonConfig.log('✅ PostgreSQL connection established successfully!', 'Database');

          // Initialize MongoDB connection
          winstonConfig.log('🍃 Connecting to MongoDB...', 'Database');
          const mongoConfig = databaseConfig.getMongoDBConfig();
          await databaseManager.addConnection('mongodb', mongoConfig);
          winstonConfig.log('✅ MongoDB connection established successfully!', 'Database');

          winstonConfig.log('=====================================', 'Database');
          winstonConfig.log('🎉 All database connections are ready!', 'Database');
          winstonConfig.log('=====================================', 'Database');

          return databaseManager;
        } catch (error) {
          winstonConfig.error('❌ Database initialization failed:', error.message, 'Database');
          throw error;
        }
      },
      inject: [DatabaseManager, DatabaseConfig],
    },
  ],
  exports: [
    DatabaseManager,
    DatabaseConfig,
    MongoDBService,
    UserHrDataService,
    'DATABASE_INITIALIZER',
  ],
})
export class DatabaseModule {}