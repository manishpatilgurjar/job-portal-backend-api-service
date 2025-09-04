import { Controller, Get } from '@nestjs/common';
import { RouteDocumentation } from './route-documentation';
import { RouteRegistry } from './route-registry';

/**
 * Route information controller
 * Provides API endpoints to get route documentation and information
 */
@Controller('api/routes')
export class RouteController {
  /**
   * Get all available routes
   */
  @Get()
  getRoutes() {
    return {
      success: true,
      data: RouteDocumentation.generateRouteList(),
      message: 'Available routes retrieved successfully',
    };
  }

  /**
   * Get route summary
   */
  @Get('summary')
  getRouteSummary() {
    return {
      success: true,
      data: RouteDocumentation.generateRouteSummary(),
      message: 'Route summary retrieved successfully',
    };
  }

  /**
   * Get OpenAPI documentation
   */
  @Get('docs')
  getOpenAPIDocs() {
    return {
      success: true,
      data: RouteDocumentation.generateOpenAPIDocs(),
      message: 'OpenAPI documentation generated successfully',
    };
  }

  /**
   * Get public routes only
   */
  @Get('public')
  getPublicRoutes() {
    return {
      success: true,
      data: RouteRegistry.getPublicRoutes(),
      message: 'Public routes retrieved successfully',
    };
  }

  /**
   * Get protected routes only
   */
  @Get('protected')
  getProtectedRoutes() {
    return {
      success: true,
      data: RouteRegistry.getProtectedRoutes(),
      message: 'Protected routes retrieved successfully',
    };
  }
}
