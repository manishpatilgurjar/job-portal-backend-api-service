import { Injectable, OnModuleInit } from '@nestjs/common';
import { Knex } from 'knex';
import { DatabaseManager } from '../../database/managers/database-manager';

// TypeScript interfaces for database tables
export interface User {
  id: string;
  email?: string;
  password_hash?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  bio?: string;
  profile_picture_url?: string;
  resume_url?: string;
  cover_letter_url?: string;
  portfolio_url?: string;
  linkedin_url?: string;
  github_url?: string;
  website_url?: string;
  country?: string;
  state?: string;
  city?: string;
  postal_code?: string;
  is_remote_available: boolean;
  is_relocation_available: boolean;
  user_type: 'job_seeker' | 'employer' | 'admin';
  current_job_title?: string;
  current_company?: string;
  experience_level?: 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
  expected_salary_min?: number;
  expected_salary_max?: number;
  currency: string;
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship';
  is_available_for_work: boolean;
  available_from?: Date;
  skills?: any;
  preferred_job_types?: any;
  preferred_industries?: any;
  preferred_locations?: any;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_active: boolean;
  is_profile_complete: boolean;
  account_status: 'active' | 'suspended' | 'deactivated' | 'pending_verification';
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  job_alerts: boolean;
  marketing_emails: boolean;
  last_login_at?: Date;
  email_verified_at?: Date;
  phone_verified_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  device_info?: string;
  ip_address?: string;
  is_revoked: boolean;
  revoked_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  is_used: boolean;
  used_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PhoneVerificationToken {
  id: string;
  phone: string;
  otp_code: string;
  expires_at: Date;
  attempts: number;
  is_verified: boolean;
  verified_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface OAuthAccount {
  id: string;
  user_id: string;
  provider: string;
  provider_id: string;
  email?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: Date;
  provider_data?: any;
  created_at: Date;
  updated_at: Date;
}

// Input types for creating/updating records
export interface CreateUserInput {
  email?: string;
  password_hash?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_type?: 'job_seeker' | 'employer' | 'admin';
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
  account_status?: 'active' | 'suspended' | 'deactivated' | 'pending_verification';
  is_active?: boolean;
  profile_picture_url?: string;
}

export interface CreateRefreshTokenInput {
  user_id: string;
  token: string;
  expires_at: Date;
  device_info?: string;
  ip_address?: string;
}

export interface CreatePasswordResetTokenInput {
  user_id: string;
  token: string;
  expires_at: Date;
}

export interface CreatePhoneVerificationTokenInput {
  phone: string;
  otp_code: string;
  expires_at: Date;
}

export interface CreateOAuthAccountInput {
  user_id: string;
  provider: string;
  provider_id: string;
  email?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: Date;
  provider_data?: any;
}

@Injectable()
export class AuthModel implements OnModuleInit {
  private knex: Knex;

  constructor(private databaseManager: DatabaseManager) {
    // Database connection will be initialized in onModuleInit
  }

  async onModuleInit(): Promise<void> {
    // Get Knex instance from PostgreSQL connection after module initialization
    const postgresConnection = this.databaseManager.getPostgreSQLConnection('postgresql');
    this.knex = postgresConnection.getConnection();
  }

  // User operations
  async findUserByEmail(email: string): Promise<User | null> {
    const result = await this.knex('users')
      .where('email', email)
      .first();
    return result || null;
  }

  async findUserByPhone(phone: string): Promise<User | null> {
    const result = await this.knex('users')
      .where('phone', phone)
      .first();
    return result || null;
  }

  async findUserById(id: string): Promise<User | null> {
    const result = await this.knex('users')
      .where('id', id)
      .first();
    return result || null;
  }

  async findUserByIdActive(id: string): Promise<User | null> {
    const result = await this.knex('users')
      .where('id', id)
      .where('is_active', true)
      .first();
    return result || null;
  }

  async createUser(userData: CreateUserInput): Promise<User> {
    const [user] = await this.knex('users')
      .insert({
        ...userData,
        created_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      })
      .returning('*');
    return user;
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    await this.knex('users')
      .where('id', userId)
      .update({
        last_login_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      });
  }

  async updateUserPhoneVerification(userId: string): Promise<void> {
    await this.knex('users')
      .where('id', userId)
      .update({
        is_phone_verified: true,
        phone_verified_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      });
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await this.knex('users')
      .where('id', userId)
      .update({
        password_hash: passwordHash,
        updated_at: this.knex.fn.now(),
      });
  }

  async getUserProfile(userId: string): Promise<Partial<User> | null> {
    const result = await this.knex('users')
      .select(
        'id',
        'email',
        'phone',
        'first_name',
        'last_name',
        'profile_picture_url',
        'is_email_verified',
        'is_phone_verified',
        'created_at',
        'updated_at'
      )
      .where('id', userId)
      .first();
    return result || null;
  }

  // Refresh token operations
  async createRefreshToken(tokenData: CreateRefreshTokenInput): Promise<RefreshToken> {
    const [token] = await this.knex('refresh_tokens')
      .insert({
        ...tokenData,
        created_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      })
      .returning('*');
    return token;
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    const result = await this.knex('refresh_tokens')
      .where('token', token)
      .where('expires_at', '>', this.knex.fn.now())
      .where('is_revoked', false)
      .first();
    return result || null;
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.knex('refresh_tokens')
      .where('id', tokenId)
      .update({
        is_revoked: true,
        revoked_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      });
  }

  async revokeRefreshTokenByToken(token: string): Promise<void> {
    await this.knex('refresh_tokens')
      .where('token', token)
      .update({
        is_revoked: true,
        revoked_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      });
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.knex('refresh_tokens')
      .where('user_id', userId)
      .update({
        is_revoked: true,
        revoked_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      });
  }

  // Password reset token operations
  async createPasswordResetToken(tokenData: CreatePasswordResetTokenInput): Promise<PasswordResetToken> {
    const [token] = await this.knex('password_reset_tokens')
      .insert({
        ...tokenData,
        created_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      })
      .returning('*');
    return token;
  }

  async findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    const result = await this.knex('password_reset_tokens')
      .where('token', token)
      .where('expires_at', '>', this.knex.fn.now())
      .where('is_used', false)
      .first();
    return result || null;
  }

  async markPasswordResetTokenAsUsed(tokenId: string): Promise<void> {
    await this.knex('password_reset_tokens')
      .where('id', tokenId)
      .update({
        is_used: true,
        used_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      });
  }

  // Phone verification token operations
  async createOrUpdatePhoneVerificationToken(tokenData: CreatePhoneVerificationTokenInput): Promise<PhoneVerificationToken> {
    const [token] = await this.knex('phone_verification_tokens')
      .insert({
        ...tokenData,
        attempts: 0,
        is_verified: false,
        created_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      })
      .onConflict('phone')
      .merge({
        otp_code: tokenData.otp_code,
        expires_at: tokenData.expires_at,
        attempts: 0,
        is_verified: false,
        verified_at: null,
        updated_at: this.knex.fn.now(),
      })
      .returning('*');
    return token;
  }

  async findPhoneVerificationToken(phone: string, otpCode: string): Promise<PhoneVerificationToken | null> {
    const result = await this.knex('phone_verification_tokens')
      .where('phone', phone)
      .where('otp_code', otpCode)
      .where('expires_at', '>', this.knex.fn.now())
      .where('is_verified', false)
      .first();
    return result || null;
  }

  async markPhoneVerificationTokenAsVerified(tokenId: string): Promise<void> {
    await this.knex('phone_verification_tokens')
      .where('id', tokenId)
      .update({
        is_verified: true,
        verified_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      });
  }

  // OAuth account operations
  async findOAuthAccount(provider: string, providerId: string): Promise<OAuthAccount | null> {
    const result = await this.knex('oauth_accounts')
      .where('provider', provider)
      .where('provider_id', providerId)
      .first();
    return result || null;
  }

  async createOAuthAccount(oauthData: CreateOAuthAccountInput): Promise<OAuthAccount> {
    const [account] = await this.knex('oauth_accounts')
      .insert({
        ...oauthData,
        created_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      })
      .returning('*');
    return account;
  }

  async updateOAuthTokens(accountId: string, accessToken: string, refreshToken: string, expiresAt: Date): Promise<void> {
    await this.knex('oauth_accounts')
      .where('id', accountId)
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        updated_at: this.knex.fn.now(),
      });
  }

  // Utility methods
  async checkEmailExists(email: string): Promise<boolean> {
    const result = await this.knex('users')
      .select('id')
      .where('email', email)
      .first();
    return !!result;
  }

  async checkPhoneExists(phone: string): Promise<boolean> {
    const result = await this.knex('users')
      .select('id')
      .where('phone', phone)
      .first();
    return !!result;
  }

  // Transaction support
  async withTransaction<T>(callback: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
    return await this.knex.transaction(callback);
  }
}