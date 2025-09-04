import { ModuleRouteConfig } from './interfaces/route.interface';
import { authRoutesConfig } from './auth.routes';
import { userRoutesConfig } from './user.routes';
import { hrExtractionRoutesConfig } from '../hr-extraction/routes/hr-extraction.routes';

/**
 * Centralized route registry
 * All module routes are registered here
 */
export class RouteRegistry {
  private static routes: Map<string, ModuleRouteConfig> = new Map();

  /**
   * Register a module's routes
   */
  static register(moduleName: string, config: ModuleRouteConfig): void {
    this.routes.set(moduleName, config);
  }

  /**
   * Get all registered routes
   */
  static getAllRoutes(): Map<string, ModuleRouteConfig> {
    return this.routes;
  }

  /**
   * Get routes for a specific module
   */
  static getModuleRoutes(moduleName: string): ModuleRouteConfig | undefined {
    return this.routes.get(moduleName);
  }

  /**
   * Get all public routes (no authentication required)
   */
  static getPublicRoutes(): ModuleRouteConfig[] {
    return Array.from(this.routes.values()).filter(config => 
      config.routes.some(route => !route.auth)
    );
  }

  /**
   * Get all protected routes (authentication required)
   */
  static getProtectedRoutes(): ModuleRouteConfig[] {
    return Array.from(this.routes.values()).filter(config => 
      config.routes.some(route => route.auth)
    );
  }

  /**
   * Get route documentation
   */
  static getRouteDocumentation(): any {
    const documentation: any = {};
    
    this.routes.forEach((config, moduleName) => {
      documentation[moduleName] = {
        basePath: config.basePath,
        version: config.version,
        routes: config.routes.map(route => ({
          path: `${config.basePath}/${route.path}`,
          method: route.method,
          description: route.description,
          auth: route.auth,
          roles: route.roles,
        })),
      };
    });

    return documentation;
  }
}

// Register all module routes
RouteRegistry.register('auth', authRoutesConfig);
RouteRegistry.register('user', userRoutesConfig);
RouteRegistry.register('hr-extraction', hrExtractionRoutesConfig);

// Export for easy access
export { RouteRegistry as default };
