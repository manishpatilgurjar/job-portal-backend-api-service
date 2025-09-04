import { RouteRegistry } from './route-registry';

/**
 * Generate API documentation from route registry
 */
export class RouteDocumentation {
  /**
   * Generate OpenAPI/Swagger compatible documentation
   */
  static generateOpenAPIDocs(): any {
    const routes = RouteRegistry.getAllRoutes();
    const paths: any = {};

    routes.forEach((config) => {
      config.routes.forEach((route) => {
        const fullPath = `${config.basePath}/${route.path}`;
        
        if (!paths[fullPath]) {
          paths[fullPath] = {};
        }

        paths[fullPath][route.method.toLowerCase()] = {
          summary: route.description,
          tags: [config.module.replace('Module', '')],
          security: route.auth ? [{ bearerAuth: [] }] : [],
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { type: 'object' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
            },
            '401': {
              description: 'Unauthorized',
            },
            '500': {
              description: 'Internal Server Error',
            },
          },
        };
      });
    });

    return {
      openapi: '3.0.0',
      info: {
        title: 'Job Portal API',
        version: '1.0.0',
        description: 'Job Portal Backend API Documentation',
      },
      servers: [
        {
          url: process.env.API_BASE_URL || 'http://localhost:3000',
          description: 'Development server',
        },
      ],
      paths,
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    };
  }

  /**
   * Generate simple route list
   */
  static generateRouteList(): any {
    return RouteRegistry.getRouteDocumentation();
  }

  /**
   * Generate route summary
   */
  static generateRouteSummary(): any {
    const routes = RouteRegistry.getAllRoutes();
    const summary = {
      totalModules: routes.size,
      totalRoutes: 0,
      publicRoutes: 0,
      protectedRoutes: 0,
      modules: [] as any[],
    };

    routes.forEach((config, moduleName) => {
      const moduleSummary = {
        module: moduleName,
        basePath: config.basePath,
        totalRoutes: config.routes.length,
        publicRoutes: config.routes.filter(r => !r.auth).length,
        protectedRoutes: config.routes.filter(r => r.auth).length,
      };

      summary.totalRoutes += moduleSummary.totalRoutes;
      summary.publicRoutes += moduleSummary.publicRoutes;
      summary.protectedRoutes += moduleSummary.protectedRoutes;
      summary.modules.push(moduleSummary);
    });

    return summary;
  }
}
