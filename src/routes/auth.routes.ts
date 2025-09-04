import { ModuleRouteConfig } from './interfaces/route.interface';

/**
 * Authentication module routes configuration
 * All auth-related endpoints are defined here
 */
export const authRoutesConfig: ModuleRouteConfig = {
  module: 'AuthModule',
  basePath: '/api/auth',
  version: 'v1',
  routes: [
    {
      path: 'signup',
      method: 'POST',
      description: 'User registration endpoint',
      auth: false,
    },
    {
      path: 'login',
      method: 'POST',
      description: 'User login with email and password',
      auth: false,
    },
    {
      path: 'login/phone',
      method: 'POST',
      description: 'User login with phone number and OTP',
      auth: false,
    },
    {
      path: 'send-otp',
      method: 'POST',
      description: 'Send OTP to phone number',
      auth: false,
    },
    {
      path: 'google',
      method: 'POST',
      description: 'Google OAuth authentication',
      auth: false,
    },
    {
      path: 'refresh',
      method: 'POST',
      description: 'Refresh access token',
      auth: false,
    },
    {
      path: 'forgot-password',
      method: 'POST',
      description: 'Request password reset',
      auth: false,
    },
    {
      path: 'reset-password',
      method: 'POST',
      description: 'Reset password with token',
      auth: false,
    },
    {
      path: 'logout',
      method: 'POST',
      description: 'User logout (requires authentication)',
      auth: true,
    },
    {
      path: 'me',
      method: 'GET',
      description: 'Get current user profile (requires authentication)',
      auth: true,
    },
  ],
};
