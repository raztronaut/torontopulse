import type { FeatureCollection } from 'geojson';

export interface DataSourcePlugin {
  metadata: DataSourceMetadata;
  fetcher: DataFetcher;
  transformer: DataTransformer;
  validator: DataValidator;
  cacheStrategy?: CacheStrategy;
  
  // Core plugin methods
  fetchData(): Promise<FeatureCollection>;
  
  // Lifecycle hooks
  onLoad?(): Promise<void>;
  onEnable?(): Promise<void>;
  onDisable?(): Promise<void>;
  onUnload?(): Promise<void>;
}

export interface DataSourceMetadata {
  id: string;
  name: string;
  domain: string;
  version: string;
  description: string;
  refreshInterval: number;
  reliability: 'high' | 'medium' | 'low';
  tags: string[];
  author: string;
  dataLicense: string;
  apiDocumentationUrl?: string;
}

export interface DataFetcher {
  fetch(): Promise<any>;
}

export interface DataTransformer {
  transform(data: any): FeatureCollection | Promise<FeatureCollection>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  data: any;
}

export interface DataValidator {
  validate(data: any): ValidationResult;
}

export interface CacheStrategy {
  key: string;
  ttl: number;
  storage: 'memory' | 'indexeddb' | 'localstorage';
  invalidationRules: string[];
}

export interface APIConfiguration {
  type: 'json' | 'xml' | 'csv' | 'gtfs' | 'custom';
  baseUrl: string;
  authentication?: {
    type: 'apikey' | 'oauth' | 'basic';
    config: Record<string, string>;
  };
  rateLimit?: {
    requests: number;
    window: number;
  };
  timeout?: number;
}

export interface TransformConfiguration {
  strategy: string;
  mappings: Record<string, string>;
}

export interface VisualizationConfiguration {
  layer: {
    type: string;
    paint: Record<string, any>;
  };
  popup?: {
    template: string;
  };
}

export interface DataSourceConfig {
  metadata: DataSourceMetadata;
  api: APIConfiguration;
  transform: TransformConfiguration;
  visualization?: VisualizationConfiguration;
  cache?: CacheStrategy;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  issues: string[];
}

export interface DataSourceMetrics {
  sourceId: string;
  fetchCount: number;
  errorCount: number;
  avgResponseTime: number;
  lastSuccessfulFetch: Date;
  dataQualityScore: number;
}

export interface InvalidationRule {
  type: 'time' | 'event' | 'condition';
  config: Record<string, any>;
} 