export interface RouteConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  auth: boolean;
  roles?: string[];
}

export interface ModuleRouteConfig {
  module: string;
  basePath: string;
  version: string;
  routes: RouteConfig[];
}
