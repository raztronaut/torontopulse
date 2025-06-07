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
  arrayProperty?: string;
  sampleResponse?: any;
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