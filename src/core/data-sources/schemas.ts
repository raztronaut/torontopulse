import { z } from 'zod';

export const DataSourceMetadataSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Name is required'),
  domain: z.enum(['transportation', 'infrastructure', 'environment', 'events'], {
    errorMap: () => ({ message: 'Domain must be one of: transportation, infrastructure, environment, events' })
  }),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must follow semantic versioning (x.y.z)'),
  description: z.string().min(1, 'Description is required'),
  refreshInterval: z.number().min(1000, 'Refresh interval must be at least 1000ms'),
  reliability: z.enum(['high', 'medium', 'low']),
  tags: z.array(z.string()).default([]),
  author: z.string().min(1, 'Author is required'),
  dataLicense: z.string().min(1, 'Data license is required'),
  apiDocumentationUrl: z.string().url().optional()
});

export const APIConfigurationSchema = z.object({
  type: z.enum(['json', 'xml', 'csv', 'gtfs', 'custom']),
  baseUrl: z.string().url('Base URL must be a valid URL'),
  authentication: z.optional(z.object({
    type: z.enum(['apikey', 'oauth', 'basic']),
    config: z.record(z.string())
  })),
  rateLimit: z.optional(z.object({
    requests: z.number().positive('Requests must be positive'),
    window: z.number().positive('Window must be positive')
  })),
  timeout: z.number().positive().default(10000)
});

export const TransformConfigurationSchema = z.object({
  strategy: z.string(),
  mappings: z.record(z.string())
});

export const CacheStrategySchema = z.object({
  key: z.string(),
  ttl: z.number().positive('TTL must be positive'),
  storage: z.enum(['memory', 'indexeddb', 'localstorage']),
  invalidationRules: z.array(z.string()).default([])
});

export const VisualizationConfigurationSchema = z.object({
  layer: z.object({
    type: z.string(),
    paint: z.record(z.any())
  }),
  popup: z.optional(z.object({
    template: z.string()
  }))
});

export const DataSourceConfigSchema = z.object({
  metadata: DataSourceMetadataSchema,
  api: APIConfigurationSchema,
  transform: TransformConfigurationSchema,
  visualization: VisualizationConfigurationSchema.optional(),
  cache: CacheStrategySchema.optional()
});

// Export inferred types
export type DataSourceMetadata = z.infer<typeof DataSourceMetadataSchema>;
export type APIConfiguration = z.infer<typeof APIConfigurationSchema>;
export type TransformConfiguration = z.infer<typeof TransformConfigurationSchema>;
export type CacheStrategy = z.infer<typeof CacheStrategySchema>;
export type VisualizationConfiguration = z.infer<typeof VisualizationConfigurationSchema>;
export type DataSourceConfig = z.infer<typeof DataSourceConfigSchema>;

// Validation helpers
export function validateDataSourceConfig(config: unknown): DataSourceConfig {
  try {
    return DataSourceConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      throw new Error(`Configuration validation failed: ${issues}`);
    }
    throw error;
  }
}

export function validatePartialConfig(config: unknown, schema: z.ZodSchema): any {
  try {
    return schema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      throw new Error(`Validation failed: ${issues}`);
    }
    throw error;
  }
}

// Pre-defined cache strategies for common use cases
export const CACHE_STRATEGIES = {
  REAL_TIME: {
    key: 'real-time',
    ttl: 30000, // 30 seconds
    storage: 'memory' as const,
    invalidationRules: ['on-error', 'on-stale']
  },
  SEMI_STATIC: {
    key: 'semi-static',
    ttl: 300000, // 5 minutes
    storage: 'indexeddb' as const,
    invalidationRules: ['daily', 'on-version-change']
  },
  STATIC: {
    key: 'static',
    ttl: 86400000, // 24 hours
    storage: 'indexeddb' as const,
    invalidationRules: ['weekly']
  }
} as const; 