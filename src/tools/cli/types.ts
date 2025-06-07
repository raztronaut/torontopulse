export interface PluginConfig {
  name: string;
  domain: 'transportation' | 'infrastructure' | 'environment' | 'events';
  description: string;
  apiUrl: string;
  apiType: 'json' | 'xml' | 'csv' | 'gtfs';
  refreshInterval: number;
  reliability: 'high' | 'medium' | 'low';
  tags: string[];
  author: string;
  dataLicense: string;
  includeTests?: boolean;
  /**
   * If the API response wraps the data array inside an object property, specify that property name here.
   * Leave undefined when the API returns a top-level array.
   */
  arrayProperty?: string;
}

export interface TestResult {
  step: string;
  success: boolean;
  message?: string;
  details?: any;
  duration?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DatasetInfo {
  title: string;
  url: string;
  description: string;
  tags: string[];
  format: string;
  domain?: string;
  hasGeoData: boolean;
  canAutoGenerate: boolean;
} 