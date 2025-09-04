import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create refresh_tokens table
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token').notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.string('device_info').nullable();
    table.string('ip_address').nullable();
    table.boolean('is_revoked').defaultTo(false);
    table.timestamp('revoked_at').nullable();
    table.timestamps(true, true);
    
    table.index(['user_id']);
    table.index(['token']);
    table.index(['expires_at']);
    table.index(['is_revoked']);
  });

  // Create password_reset_tokens table
  await knex.schema.createTable('password_reset_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token').notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.boolean('is_used').defaultTo(false);
    table.timestamp('used_at').nullable();
    table.timestamps(true, true);
    
    table.index(['user_id']);
    table.index(['token']);
    table.index(['expires_at']);
    table.index(['is_used']);
  });

  // Create email_verification_tokens table
  await knex.schema.createTable('email_verification_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token').notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.boolean('is_used').defaultTo(false);
    table.timestamp('used_at').nullable();
    table.timestamps(true, true);
    
    table.index(['user_id']);
    table.index(['token']);
    table.index(['expires_at']);
    table.index(['is_used']);
  });

  // Create phone_verification_tokens table
  await knex.schema.createTable('phone_verification_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('phone').notNullable();
    table.string('otp_code').notNullable();
    table.timestamp('expires_at').notNullable();
    table.integer('attempts').defaultTo(0);
    table.boolean('is_verified').defaultTo(false);
    table.timestamp('verified_at').nullable();
    table.timestamps(true, true);
    
    table.index(['phone']);
    table.index(['otp_code']);
    table.index(['expires_at']);
    table.index(['is_verified']);
  });

  // Create oauth_accounts table
  await knex.schema.createTable('oauth_accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('provider').notNullable(); // 'google', 'facebook', 'linkedin', etc.
    table.string('provider_id').notNullable(); // External provider user ID
    table.string('email').nullable();
    table.string('access_token').nullable();
    table.string('refresh_token').nullable();
    table.timestamp('token_expires_at').nullable();
    table.json('provider_data').nullable(); // Store additional provider data
    table.timestamps(true, true);
    
    table.unique(['provider', 'provider_id']);
    table.index(['user_id']);
    table.index(['provider']);
    table.index(['email']);
  });

  // Create login_attempts table for rate limiting
  await knex.schema.createTable('login_attempts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('identifier').notNullable(); // email or phone
    table.string('ip_address').notNullable();
    table.enum('attempt_type', ['email', 'phone', 'google']).notNullable();
    table.boolean('success').notNullable();
    table.string('failure_reason').nullable();
    table.timestamp('attempted_at').defaultTo(knex.fn.now());
    
    table.index(['identifier']);
    table.index(['ip_address']);
    table.index(['attempted_at']);
    table.index(['success']);
  });

  // Create user_sessions table for session management
  await knex.schema.createTable('user_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('session_token').notNullable().unique();
    table.string('device_info').nullable();
    table.string('ip_address').nullable();
    table.string('user_agent').nullable();
    table.timestamp('last_activity').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['user_id']);
    table.index(['session_token']);
    table.index(['expires_at']);
    table.index(['is_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('user_sessions');
  await knex.schema.dropTable('login_attempts');
  await knex.schema.dropTable('oauth_accounts');
  await knex.schema.dropTable('phone_verification_tokens');
  await knex.schema.dropTable('email_verification_tokens');
  await knex.schema.dropTable('password_reset_tokens');
  await knex.schema.dropTable('refresh_tokens');
}

