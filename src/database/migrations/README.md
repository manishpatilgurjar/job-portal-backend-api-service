# Database Migrations

This folder contains Knex.js migration files for PostgreSQL database schema changes.

## Usage

### Create a new migration:
```bash
npm run db:migrate:make migration_name
```

### Run migrations:
```bash
npm run db:migrate
```

### Rollback migrations:
```bash
npm run db:migrate:rollback
```

### Check migration status:
```bash
npm run db:migrate:status
```

## Example Migration Structure

```typescript
import Knex from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('table_name', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('table_name');
}
```
