# Database Seeds

This folder contains Knex.js seed files for populating the PostgreSQL database with initial data.

## Usage

### Create a new seed:
```bash
npm run db:seed:make seed_name
```

### Run seeds:
```bash
npm run db:seed
```

## Example Seed Structure

```typescript
import Knex from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('table_name').del();

  // Inserts seed entries
  await knex('table_name').insert([
    { id: 1, name: 'Example 1' },
    { id: 2, name: 'Example 2' },
  ]);
}
```
