import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseManager } from '../../database/managers/database-manager';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private databaseManager: DatabaseManager,
  ) {
    const jwtSecret = 'default-secret';
    console.log('🔐 [JWT-STRATEGY] Initializing with hardcoded JWT secret: default-secret');
    console.log('🔐 [JWT-STRATEGY] JWT secret length:', jwtSecret.length);
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'default-secret',
    });
  }

  async validate(payload: any) {
    try {
      // Get user from database using Knex query builder (same as auth model)
      const postgresConnection = this.databaseManager.getPostgreSQLConnection('postgresql');
      const knex = postgresConnection.getConnection();
      
      const result = await knex('users')
        .select('id', 'email', 'first_name', 'last_name', 'user_type', 'is_active', 'account_status')
        .where('id', payload.sub)
        .first();

      if (!result) {
        throw new UnauthorizedException('User not found');
      }

      if (!result.is_active || result.account_status !== 'active') {
        throw new UnauthorizedException('User account is not active');
      }

      return {
        id: result.id,
        email: result.email,
        firstName: result.first_name,
        lastName: result.last_name,
        userType: result.user_type,
        isActive: result.is_active,
        accountStatus: result.account_status,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
