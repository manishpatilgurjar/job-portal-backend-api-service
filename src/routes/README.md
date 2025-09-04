# Centralized Routing System

This directory contains the centralized routing configuration for the Job Portal Backend API. All module routes are organized and managed from this location.

## Structure

```
src/routes/
├── index.ts                    # Main routes module
├── route-registry.ts          # Route registry for managing all routes
├── route-documentation.ts     # API documentation generator
├── route.controller.ts        # Route information API endpoints
├── interfaces/
│   └── route.interface.ts     # TypeScript interfaces for route configuration
├── auth.routes.ts             # Authentication module routes
└── README.md                  # This file
```

## Features

- **Centralized Configuration**: All routes are defined in one place
- **Type Safety**: Full TypeScript support with interfaces
- **Route Registry**: Centralized management of all routes
- **API Documentation**: Automatic generation of OpenAPI/Swagger docs
- **Route Information API**: Endpoints to get route information
- **Authentication Tracking**: Track which routes require authentication
- **Versioning Support**: Support for API versioning

## Usage

### Adding New Module Routes

1. Create a new route configuration file (e.g., `user.routes.ts`)
2. Define your routes using the `ModuleRouteConfig` interface
3. Register the routes in `route-registry.ts`
4. Add the routes to the main `index.ts` file

Example:
```typescript
// user.routes.ts
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
      path: 'update',
      method: 'PUT',
      description: 'Update user profile',
      auth: true,
    },
  ],
};
```

### Route Information API

The system provides several endpoints to get route information:

- `GET /api/routes` - Get all available routes
- `GET /api/routes/summary` - Get route summary statistics
- `GET /api/routes/docs` - Get OpenAPI documentation
- `GET /api/routes/public` - Get public routes only
- `GET /api/routes/protected` - Get protected routes only

## Route Configuration

Each route can be configured with:

- `path`: The route path
- `method`: HTTP method (GET, POST, PUT, DELETE, PATCH)
- `description`: Route description for documentation
- `auth`: Whether authentication is required
- `roles`: Required user roles (optional)
- `middleware`: Middleware to apply (optional)
- `version`: API version (optional)

## Benefits

1. **Organization**: All routes are organized by module
2. **Maintainability**: Easy to find and update routes
3. **Documentation**: Automatic API documentation generation
4. **Type Safety**: Full TypeScript support
5. **Scalability**: Easy to add new modules and routes
6. **Consistency**: Standardized route configuration format
