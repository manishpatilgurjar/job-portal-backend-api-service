import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthModel } from '../models/auth.model';
import * as bcrypt from 'bcryptjs';
import { SignupDto, LoginDto, PhoneLoginDto, GoogleAuthDto, ForgotPasswordDto, ResetPasswordDto } from '../dto/auth.dto';
import { winstonConfig } from '../../common/logger/winston.config';

@Injectable()
export class AuthService {
  constructor(
    private authModel: AuthModel,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, phone, firstName, lastName, password, confirmPassword } = signupDto;

    // Validate password confirmation
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Check if user already exists
    const emailExists = await this.authModel.checkEmailExists(email);
    if (emailExists) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.authModel.createUser({
      email,
      phone: phone || undefined,
      first_name: firstName,
      last_name: lastName,
      password_hash: passwordHash,
      user_type: 'job_seeker',
      is_email_verified: false,
      is_phone_verified: false,
      account_status: 'pending_verification',
      is_active: true,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: null,
        isEmailVerified: user.is_email_verified,
        isPhoneVerified: user.is_phone_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Get user from database
    const user = await this.authModel.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active || user.account_status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // Verify password
    if (!user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.authModel.updateUserLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.profile_picture_url,
        isEmailVerified: user.is_email_verified,
        isPhoneVerified: user.is_phone_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async phoneLogin(phoneLoginDto: PhoneLoginDto) {
    const { phone, otp } = phoneLoginDto;

    // Verify OTP
    const otpRecord = await this.authModel.findPhoneVerificationToken(phone, otp);
    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Mark OTP as verified
    await this.authModel.markPhoneVerificationTokenAsVerified(otpRecord.id);

    // Get or create user
    let user = await this.authModel.findUserByPhone(phone);
    if (!user) {
      // Create new user with phone
      user = await this.authModel.createUser({
        phone,
        first_name: 'User', // Default first name
        last_name: 'User', // Default last name
        password_hash: '', // No password for phone-only users
        user_type: 'job_seeker',
        is_phone_verified: true,
        account_status: 'active',
        is_active: true
      });
    } else {
      // Update phone verification status
      await this.authModel.updateUserPhoneVerification(user.id);
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.profile_picture_url,
        isEmailVerified: user.is_email_verified,
        isPhoneVerified: user.is_phone_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async sendOtp(phone: string) {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await this.authModel.createOrUpdatePhoneVerificationToken({
      phone,
      otp_code: otp,
      expires_at: expiresAt,
    });

    // TODO: Send OTP via SMS service (Twilio, etc.)
    winstonConfig.log(`OTP for ${phone}: ${otp}`, 'AuthService'); // For development only

    return { message: `OTP sent successfully to ${phone}` };
  }

  async googleAuth(googleAuthDto: GoogleAuthDto) {
    const { userInfo, googleTokens } = googleAuthDto;

    // Check if OAuth account exists
    const oauthAccount = await this.authModel.findOAuthAccount('google', userInfo.id);

    let user;
    let isNewUser = false;

    if (oauthAccount) {
      // Existing OAuth account
      user = await this.authModel.findUserById(oauthAccount.user_id);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Update OAuth tokens
      if (googleTokens.access_token && googleTokens.refresh_token) {
        await this.authModel.updateOAuthTokens(
          oauthAccount.id,
          googleTokens.access_token,
          googleTokens.refresh_token,
          new Date(Date.now() + googleTokens.expires_in * 1000)
        );
      }
    } else {
      // Check if user exists with this email
      user = await this.authModel.findUserByEmail(userInfo.email);

      if (user) {
        // Link OAuth account to existing user
        await this.authModel.createOAuthAccount({
          user_id: user.id,
          provider: 'google',
          provider_id: userInfo.id,
          email: userInfo.email,
          access_token: googleTokens.access_token,
          refresh_token: googleTokens.refresh_token,
          token_expires_at: new Date(Date.now() + googleTokens.expires_in * 1000),
          provider_data: userInfo,
        });
      } else {
        // Create new user
        const nameParts = userInfo.name.split(' ');
        const firstName = nameParts[0] || 'User';
        const lastName = nameParts.slice(1).join(' ') || 'User';

        user = await this.authModel.createUser({
          email: userInfo.email,
          first_name: firstName,
          last_name: lastName,
          password_hash: '', // No password for OAuth users
          user_type: 'job_seeker',
          is_email_verified: true,
          account_status: 'active',
          is_active: true
        });
        isNewUser = true;

        // Create OAuth account
        await this.authModel.createOAuthAccount({
          user_id: user.id,
          provider: 'google',
          provider_id: userInfo.id,
          email: userInfo.email,
          access_token: googleTokens.access_token,
          refresh_token: googleTokens.refresh_token,
          token_expires_at: new Date(Date.now() + googleTokens.expires_in * 1000),
          provider_data: userInfo,
        });
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.profile_picture_url,
        isEmailVerified: user.is_email_verified,
        isPhoneVerified: user.is_phone_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isNewUser,
    };
  }

  async refreshToken(refreshToken: string) {
    // Verify refresh token
    const tokenRecord = await this.authModel.findRefreshToken(refreshToken);
    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Get user
    const user = await this.authModel.findUserById(tokenRecord.user_id);
    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(tokenRecord.user_id);

    // Revoke old refresh token
    await this.authModel.revokeRefreshToken(tokenRecord.id);

    return {
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Check if user exists
    const user = await this.authModel.findUserByEmail(email);
    if (!user || !user.is_active) {
      // Don't reveal if email exists or not
      return { message: 'Password reset email sent successfully' };
    }

    // Generate reset token
    const resetToken = this.generateRandomToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await this.authModel.createPasswordResetToken({
      user_id: user.id,
      token: resetToken,
      expires_at: expiresAt,
    });

    // TODO: Send reset email
    winstonConfig.log(`Password reset token for ${email}: ${resetToken}`, 'AuthService'); // For development only

    return { message: 'Password reset email sent successfully' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    // Verify reset token
    const tokenRecord = await this.authModel.findPasswordResetToken(token);
    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired token');
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.authModel.updateUserPassword(tokenRecord.user_id, passwordHash);

    // Mark token as used
    await this.authModel.markPasswordResetTokenAsUsed(tokenRecord.id);

    // Revoke all refresh tokens for this user
    await this.authModel.revokeAllUserRefreshTokens(tokenRecord.user_id);

    return { message: 'Password reset successfully' };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Find and revoke specific refresh token
      const tokenRecord = await this.authModel.findRefreshToken(refreshToken);
      if (tokenRecord) {
        await this.authModel.revokeRefreshToken(tokenRecord.id);
      }
    } else {
      // Revoke all refresh tokens for user
      await this.authModel.revokeAllUserRefreshTokens(userId);
    }

    return { message: 'Logged out successfully' };
  }

  async getCurrentUser(userId: string) {
    const user = await this.authModel.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.first_name,
      lastName: user.last_name,
      avatar: user.profile_picture_url,
      isEmailVerified: user.is_email_verified,
      isPhoneVerified: user.is_phone_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  private async generateTokens(userId: string) {
    const payload = { sub: userId };
    
    const jwtSecret = 'default-secret';
    const jwtRefreshSecret = 'default-refresh-secret';
    
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
      secret: jwtSecret,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: jwtRefreshSecret,
    });

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.authModel.createRefreshToken({
      user_id: userId,
      token: refreshToken,
      expires_at: expiresAt,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private generateRandomToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
