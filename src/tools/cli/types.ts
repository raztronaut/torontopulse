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

// Enhanced types for improved CLI functionality

export interface DatasetMetadata {
  id: string;
  name: string;
  description: string;
  resourceId: string;
  accessUrl: string;
  dataType: 'geospatial' | 'temporal' | 'categorical' | 'mixed';
  geoFields: string[];
  timeFields: string[];
  valueFields: FieldMetadata[];
  updateFrequency: string;
  corsRequired: boolean;
  tags: string[];
  organization: string;
  lastModified: string;
  format: string;
  size?: number;
}

export interface FieldMetadata {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'mixed';
  semanticType: string;
  format: string;
  nullable: boolean;
  sampleValues?: any[];
}

export interface AccessInfo {
  accessible: boolean;
  method: 'datastore' | 'direct' | 'unknown';
  url: string;
  format: string;
  corsRequired: boolean;
  sampleData?: any;
  error?: string;
}

export interface LayerConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  refreshInterval: number;
  metadata: {
    domain: string;
    dataType: string;
    updateFrequency: string;
    reliability: string;
    tags: string[];
    lastUpdated: string;
  };
  visualization: {
    layer: {
      type: string;
      paint: Record<string, any>;
      layout: Record<string, any>;
    };
    popup: {
      template: string;
      fields: string[];
    };
  };
  zoom: {
    min: number;
    max: number;
    default: number;
  };
}

export interface PopupTemplate {
  id: string;
  name: string;
  layout: 'grid' | 'list' | 'card';
  fields: PopupField[];
  styling: PopupStyling;
}

export interface PopupField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'url' | 'email' | 'temperature' | 'quality';
  format?: string;
  unit?: string;
  colorCoding?: boolean;
}

export interface PopupStyling {
  columns?: number;
  spacing: 'compact' | 'normal' | 'spacious';
  colorCoding: boolean;
  units: boolean;
  dateFormatting: 'absolute' | 'relative';
  responsive: boolean;
}

export interface ColorScheme {
  type: 'temperature' | 'quality' | 'quantity' | 'status' | 'default';
  colors: string[];
  thresholds?: number[];
  labels?: string[];
}

export interface TransformationStrategy {
  type: 'direct' | 'nested-array' | 'coordinate-mapping' | 'geocoding';
  arrayProperty?: string;
  coordinateMapping?: Record<string, [number, number]>;
  geoStrategy?: {
    type: 'coordinates' | 'address' | 'location-name';
    latField?: string;
    lonField?: string;
    addressField?: string;
    locationField?: string;
  };
}

export interface GenerationOptions {
  autoIntegrate: boolean;
  generatePopup: boolean;
  enableCaching: boolean;
  refreshInterval: number;
  layerStyling: 'auto' | 'custom';
  proxyConfiguration: boolean;
}

export interface IntegrationResult {
  success: boolean;
  pluginId: string;
  layerId: string;
  filesCreated: string[];
  filesModified: string[];
  warnings: string[];
  errors: string[];
  nextSteps: string[];
}

export interface ProgressStep {
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
  duration?: number;
}

export interface RecoveryAction {
  action: 'configure_proxy' | 'discover_resources' | 'regenerate_transformer' | 'manual_intervention';
  message: string;
  autoFix: boolean;
  requiresInput?: boolean;
}

export interface IntegrationError extends Error {
  type: 'CORS_ERROR' | 'INVALID_RESOURCE_ID' | 'TRANSFORMATION_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
  details?: any;
}

export interface FileBackup {
  path: string;
  content: string;
  timestamp: number;
}

export interface TorontoPatterns {
  beaches?: BeachPattern;
  ttc?: TTCPattern;
  neighborhoods?: NeighborhoodPattern;
  infrastructure?: InfrastructurePattern;
  events?: EventPattern;
}

export interface BeachPattern {
  type: 'beach-observations';
  temperatureFields: string[];
  qualityFields: string[];
  locationField: string;
}

export interface TTCPattern {
  type: 'transit-vehicles';
  routeField: string;
  directionField: string;
  vehicleIdField: string;
  coordinateFields: [string, string];
}

export interface NeighborhoodPattern {
  type: 'neighborhood-data';
  nameField: string;
  boundaryField?: string;
}

export interface InfrastructurePattern {
  type: 'infrastructure-data';
  statusField: string;
  locationField: string;
  typeField: string;
}

export interface EventPattern {
  type: 'event-data';
  startDateField: string;
  endDateField?: string;
  locationField: string;
  categoryField: string;
} 