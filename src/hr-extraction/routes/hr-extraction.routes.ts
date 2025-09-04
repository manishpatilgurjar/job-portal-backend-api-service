import { ModuleRouteConfig } from '../interfaces/route.interface';

/**
 * HR Extraction module routes configuration
 * All HR data extraction endpoints are defined here
 */
export const hrExtractionRoutesConfig: ModuleRouteConfig = {
  module: 'HrExtractionModule',
  basePath: '/api/hr-extraction',
  version: 'v1',
  routes: [
    {
      path: 'extract',
      method: 'POST',
      description: 'Extract HR data from uploaded file (PDF, CSV, images)',
      auth: false,
    },
    {
      path: 'extract-text',
      method: 'POST',
      description: 'Extract HR data from text input',
      auth: false,
    },
  ],
};
