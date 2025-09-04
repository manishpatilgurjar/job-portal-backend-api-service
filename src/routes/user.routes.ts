import { ModuleRouteConfig } from './interfaces/route.interface';

/**
 * User module routes configuration
 * All user-related endpoints are defined here
 */
export const userRoutesConfig: ModuleRouteConfig = {
  module: 'UserModule',
  basePath: '/api/users',
  version: 'v1',
  routes: [
    {
      path: 'profile',
      method: 'GET',
      description: 'Get user profile',
      auth: true,
    },
    {
      path: 'profile',
      method: 'PUT',
      description: 'Update user profile',
      auth: true,
    },
    {
      path: 'avatar',
      method: 'POST',
      description: 'Upload user avatar',
      auth: true,
    },
    {
      path: 'preferences',
      method: 'GET',
      description: 'Get user preferences',
      auth: true,
    },
    {
      path: 'preferences',
      method: 'PUT',
      description: 'Update user preferences',
      auth: true,
    },
    {
      path: 'skills',
      method: 'GET',
      description: 'Get user skills',
      auth: true,
    },
    {
      path: 'skills',
      method: 'POST',
      description: 'Add user skill',
      auth: true,
    },
    {
      path: 'skills/:id',
      method: 'DELETE',
      description: 'Remove user skill',
      auth: true,
    },
    {
      path: 'experience',
      method: 'GET',
      description: 'Get user work experience',
      auth: true,
    },
    {
      path: 'experience',
      method: 'POST',
      description: 'Add work experience',
      auth: true,
    },
    {
      path: 'experience/:id',
      method: 'PUT',
      description: 'Update work experience',
      auth: true,
    },
    {
      path: 'experience/:id',
      method: 'DELETE',
      description: 'Delete work experience',
      auth: true,
    },
  ],
};
