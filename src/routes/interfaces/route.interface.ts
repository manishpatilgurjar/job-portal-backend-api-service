/**
 * Route configuration interfaces for centralized routing
 */

export interface RouteConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  auth?: boolean;
  roles?: string[];
  middleware?: string[];
  version?: string;
}

export interface ModuleRouteConfig {
  module: string;
  basePath: string;
  routes: RouteConfig[];
  middleware?: string[];
  auth?: boolean;
  version?: string;
}

export interface RouteInfo {
  path: string;
  module: string;
  children?: RouteConfig[];
  middleware?: string[];
  auth?: boolean;
  version?: string;
}
