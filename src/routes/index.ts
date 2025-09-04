import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { RouteRegistry } from './route-registry';
import { RouteController } from './route.controller';

/**
 * Centralized routing configuration
 * All module routes are defined here for better organization
 */
@Module({
  imports: [
    AuthModule,
    RouterModule.register([
      {
        path: '/api/auth',
        module: AuthModule,
      },
      // Add more module routes here as they are created
    ]),
  ],
  controllers: [RouteController],
  providers: [
    {
      provide: 'ROUTE_REGISTRY',
      useValue: RouteRegistry,
    },
  ],
  exports: ['ROUTE_REGISTRY'],
})
export class RoutesModule {
  constructor() {
    // Initialize route registry
    console.log('📋 Route Registry Initialized');
    console.log('Available routes:', RouteRegistry.getRouteDocumentation());
  }
}
