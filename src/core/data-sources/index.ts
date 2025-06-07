// Core types and interfaces
export * from './types';

// Registry and service
export { DataSourceRegistry } from './registry';
export { PluginDataService } from './service';
export { BaseDataSourcePlugin } from './base-plugin';

// Validation schemas - Export only schemas, not type duplicates
export { 
  DataSourceMetadataSchema,
  APIConfigurationSchema,
  TransformConfigurationSchema,
  CacheStrategySchema,
  VisualizationConfigurationSchema,
  DataSourceConfigSchema,
  validateDataSourceConfig,
  validatePartialConfig,
  CACHE_STRATEGIES
} from './schemas';

// Transformers - Export specific items to avoid conflicts
export { 
  BaseTransformer,
  type TransformConfig,
  type FieldMapping,
  type GeometryConfig
} from './transformers/base';
export { JSONToGeoJSONTransformer } from './transformers/json-to-geojson';

// Cache management - Export specific cache items
export { CacheManager } from '../cache/strategies'; 