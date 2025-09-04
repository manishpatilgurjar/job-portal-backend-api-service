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
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret',
    });
  }

  async validate(payload: any) {
    try {
      // Get user from database
      const postgresConnection = this.databaseManager.getPostgreSQLConnection();
      const result = await postgresConnection.executeQuery(
        'SELECT id, email, first_name, last_name, user_type, is_active, account_status FROM users WHERE id = $1',
        [payload.sub]
      );

      if (!result || result.length === 0) {
        throw new UnauthorizedException('User not found');
      }

      const user = result[0];

      if (!user.is_active || user.account_status !== 'active') {
        throw new UnauthorizedException('User account is not active');
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type,
        isActive: user.is_active,
        accountStatus: user.account_status,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
