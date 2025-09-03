import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Basic user information
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('phone').nullable();
    table.date('date_of_birth').nullable();
    table.enum('gender', ['male', 'female', 'other', 'prefer_not_to_say']).nullable();
    
    // Profile information
    table.text('bio').nullable();
    table.string('profile_picture_url').nullable();
    table.string('resume_url').nullable();
    table.string('cover_letter_url').nullable();
    table.string('portfolio_url').nullable();
    table.string('linkedin_url').nullable();
    table.string('github_url').nullable();
    table.string('website_url').nullable();
    
    // Location
    table.string('country').nullable();
    table.string('state').nullable();
    table.string('city').nullable();
    table.string('postal_code').nullable();
    table.boolean('is_remote_available').defaultTo(false);
    table.boolean('is_relocation_available').defaultTo(false);
    
    // Professional information
    table.enum('user_type', ['job_seeker', 'employer', 'admin']).defaultTo('job_seeker');
    table.string('current_job_title').nullable();
    table.string('current_company').nullable();
    table.enum('experience_level', ['entry', 'junior', 'mid', 'senior', 'lead', 'executive']).nullable();
    table.decimal('expected_salary_min', 10, 2).nullable();
    table.decimal('expected_salary_max', 10, 2).nullable();
    table.string('currency', 3).defaultTo('USD');
    table.enum('employment_type', ['full_time', 'part_time', 'contract', 'freelance', 'internship']).nullable();
    table.boolean('is_available_for_work').defaultTo(true);
    table.date('available_from').nullable();
    
    // Skills and preferences
    table.json('skills').nullable(); // Array of skill objects
    table.json('preferred_job_types').nullable(); // Array of job types
    table.json('preferred_industries').nullable(); // Array of industries
    table.json('preferred_locations').nullable(); // Array of preferred locations
    
    // Account status
    table.boolean('is_email_verified').defaultTo(false);
    table.boolean('is_phone_verified').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_profile_complete').defaultTo(false);
    table.enum('account_status', ['active', 'suspended', 'deactivated', 'pending_verification']).defaultTo('pending_verification');
    
    // Notification preferences
    table.boolean('email_notifications').defaultTo(true);
    table.boolean('sms_notifications').defaultTo(false);
    table.boolean('push_notifications').defaultTo(true);
    table.boolean('job_alerts').defaultTo(true);
    table.boolean('marketing_emails').defaultTo(false);
    
    // Timestamps
    table.timestamp('last_login_at').nullable();
    table.timestamp('email_verified_at').nullable();
    table.timestamp('phone_verified_at').nullable();
    table.timestamps(true, true); // created_at and updated_at
    
    // Indexes
    table.index(['email']);
    table.index(['user_type']);
    table.index(['is_active']);
    table.index(['account_status']);
    table.index(['is_available_for_work']);
    table.index(['experience_level']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
}

