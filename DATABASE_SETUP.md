# Database Setup Guide

This document provides comprehensive information about the multi-database setup for the Job Portal Backend application.

## Overview

The application uses a sophisticated multi-database architecture with:
- **PostgreSQL** for relational data (users, jobs, applications, etc.)
- **MongoDB** for analytics, logging, and non-relational data
- **Knex.js** as the PostgreSQL query builder and migration tool
- **MongoDB Native Driver** for MongoDB operations

## Architecture

### Folder Structure

```
src/database/
├── config/                 # Database configuration
├── connections/            # Database connection classes
├── managers/              # Database management classes
├── migrations/            # PostgreSQL migrations
├── seeds/                 # Database seed files
├── repositories/          # Repository pattern implementations
├── services/              # Database services
├── interfaces/            # TypeScript interfaces
├── enums/                 # Database-related enums
├── exceptions/            # Custom database exceptions
├── decorators/            # Database decorators
└── utils/                 # Database utilities
```

### Key Components

1. **DatabaseManager**: Central manager for all database connections
2. **BaseDatabaseConnection**: Abstract base class for database connections
3. **PostgreSQLConnection**: PostgreSQL connection implementation using Knex
4. **MongoDBConnection**: MongoDB connection implementation
5. **Repository Pattern**: Abstract base classes for PostgreSQL and MongoDB repositories
6. **DatabaseService**: Facade service providing access to all repositories

## Configuration

### Environment Variables

Copy `env.example` to `.env` and configure the following:

#### PostgreSQL Configuration
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=job_portal
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_SSL=false
POSTGRES_SCHEMA=public
POSTGRES_APP_NAME=job-portal-backend
POSTGRES_CONNECTION_TIMEOUT=30000
POSTGRES_ACQUIRE_TIMEOUT=60000
POSTGRES_TIMEOUT=30000
POSTGRES_MAX_CONNECTIONS=20
POSTGRES_IDLE_TIMEOUT=30000
POSTGRES_CONNECTION_TIMEOUT_MS=30000
POSTGRES_POOL_MIN=2
POSTGRES_POOL_MAX=20
POSTGRES_POOL_IDLE=10000
```

#### MongoDB Configuration
```env
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB=job_portal
MONGO_USER=
MONGO_PASSWORD=
MONGO_SSL=false
MONGO_AUTH_SOURCE=admin
MONGO_AUTH_MECHANISM=SCRAM-SHA-1
MONGO_REPLICA_SET=
MONGO_READ_PREFERENCE=primary
MONGO_MAX_POOL_SIZE=10
MONGO_MIN_POOL_SIZE=2
MONGO_MAX_IDLE_TIME_MS=30000
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000
MONGO_SOCKET_TIMEOUT_MS=45000
MONGO_CONNECT_TIMEOUT_MS=10000
MONGO_CONNECTION_TIMEOUT=30000
MONGO_ACQUIRE_TIMEOUT=60000
MONGO_TIMEOUT=30000
MONGO_POOL_MIN=2
MONGO_POOL_MAX=10
MONGO_POOL_IDLE=10000
```

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

#### PostgreSQL Setup
```bash
# Create database
createdb job_portal

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

#### MongoDB Setup
```bash
# Start MongoDB (if using local installation)
mongod

# The application will automatically connect to MongoDB on startup
```

### 3. Available Scripts

```bash
# Database Migration Commands
npm run db:migrate              # Run pending migrations
npm run db:migrate:rollback     # Rollback last migration
npm run db:migrate:status       # Check migration status
npm run db:migrate:make <name>  # Create new migration

# Database Seeding Commands
npm run db:seed                 # Run all seed files
npm run db:seed:make <name>     # Create new seed file

# Database Management Commands
npm run db:reset                # Reset database (rollback + migrate + seed)
npm run db:setup                # Setup database (migrate + seed)
```

## Usage Examples

### Using Repositories

#### PostgreSQL Repository (UserRepository)
```typescript
import { Injectable } from '@nestjs/common';
import { UserRepository } from './database/repositories/user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(userData: any) {
    return await this.userRepository.create(userData);
  }

  async findUserByEmail(email: string) {
    return await this.userRepository.findByEmail(email);
  }

  async getUserStatistics() {
    return await this.userRepository.getStatistics();
  }
}
```

#### MongoDB Repository (AnalyticsRepository)
```typescript
import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from './database/repositories/analytics.repository';

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async trackUserActivity(activityData: any) {
    return await this.analyticsRepository.trackUserActivity(activityData);
  }

  async getJobViewStats(jobId: string) {
    return await this.analyticsRepository.getJobViewStats(jobId);
  }
}
```

### Using Database Service

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/services/database.service';

@Injectable()
export class AppService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getHealthStatus() {
    return await this.databaseService.checkHealth();
  }

  async getDatabaseStatistics() {
    return await this.databaseService.getStatistics();
  }
}
```

### Using Database Manager Directly

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseManager } from './database/managers/database-manager';

@Injectable()
export class CustomService {
  constructor(private readonly databaseManager: DatabaseManager) {}

  async executeCustomQuery() {
    // PostgreSQL query
    const result = await this.databaseManager.executeQuery(
      'postgresql',
      'SELECT * FROM users WHERE active = ?',
      [true]
    );

    // MongoDB command
    const mongoResult = await this.databaseManager.executeQuery(
      'mongodb',
      JSON.stringify({ find: 'analytics', limit: 10 })
    );

    return { postgres: result, mongo: mongoResult };
  }
}
```

## Database Schema

### PostgreSQL Tables

1. **users** - User accounts and authentication
2. **companies** - Company information
3. **job_categories** - Job categories and classifications
4. **jobs** - Job postings
5. **job_applications** - Job applications
6. **user_profiles** - Extended user profiles
7. **saved_jobs** - User's saved jobs
8. **notifications** - System notifications

### MongoDB Collections

1. **user_activities** - User activity tracking
2. **job_views** - Job view analytics
3. **application_events** - Application event tracking
4. **search_analytics** - Search query analytics

## Advanced Features

### Decorators

The system includes various decorators for database operations:

```typescript
@Transaction()           // Mark method as requiring transaction
@ReadOnly()             // Mark method as read-only
@Paginated()            // Enable pagination
@Cacheable(300)         // Enable caching with TTL
@Retryable(3, 1000)     // Enable retry with max attempts and delay
```

### Error Handling

Custom database exceptions are provided:

```typescript
import {
  DatabaseConnectionException,
  DatabaseQueryException,
  DatabaseTransactionException,
  DatabaseConfigException
} from './database/exceptions/database.exceptions';
```

### Connection Management

The DatabaseManager provides:

- Automatic connection pooling
- Health monitoring
- Connection lifecycle management
- Transaction support
- Error handling and retry logic

## Best Practices

1. **Use Repository Pattern**: Always use repositories for database operations
2. **Transaction Management**: Use decorators for transaction management
3. **Error Handling**: Use custom database exceptions
4. **Connection Pooling**: Configure appropriate pool sizes
5. **Monitoring**: Use health check endpoints
6. **Migrations**: Always use migrations for schema changes
7. **Seeding**: Use seed files for initial data

## Troubleshooting

### Common Issues

1. **Connection Timeout**: Increase timeout values in configuration
2. **Pool Exhaustion**: Increase pool size or check for connection leaks
3. **Migration Failures**: Check database permissions and existing data
4. **MongoDB Connection**: Ensure MongoDB is running and accessible

### Debug Mode

Enable debug mode for Knex queries:

```env
NODE_ENV=development
```

This will log all SQL queries to the console.

## Performance Considerations

1. **Connection Pooling**: Configure appropriate pool sizes based on load
2. **Query Optimization**: Use indexes and optimize queries
3. **Caching**: Implement caching for frequently accessed data
4. **Monitoring**: Monitor database performance and connection usage
5. **Scaling**: Consider read replicas for high-traffic scenarios

## Security

1. **Environment Variables**: Never commit sensitive data to version control
2. **SSL/TLS**: Use SSL connections in production
3. **Authentication**: Implement proper database authentication
4. **Input Validation**: Always validate and sanitize inputs
5. **SQL Injection**: Use parameterized queries (Knex handles this automatically)

## Monitoring & Maintenance

1. **Health Checks**: Implement health check endpoints
2. **Logging**: Log database operations and errors
3. **Metrics**: Monitor connection usage and query performance
4. **Backups**: Implement regular database backups
5. **Updates**: Keep database drivers and dependencies updated
