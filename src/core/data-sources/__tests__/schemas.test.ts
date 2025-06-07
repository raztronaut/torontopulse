import { describe, it, expect } from 'vitest';
import { 
  validateDataSourceConfig, 
  DataSourceConfigSchema,
  DataSourceMetadataSchema,
  APIConfigurationSchema,
  CACHE_STRATEGIES
} from '../schemas';

describe('Schema Validation', () => {
  describe('DataSourceMetadataSchema', () => {
    const validMetadata = {
      id: 'test-source',
      name: 'Test Source',
      domain: 'transportation',
      version: '1.0.0',
      description: 'A test data source',
      refreshInterval: 30000,
      reliability: 'high',
      tags: ['test', 'example'],
      author: 'Test Author',
      dataLicense: 'MIT',
      apiDocumentationUrl: 'https://example.com/docs'
    };

    it('should validate correct metadata', () => {
      const result = DataSourceMetadataSchema.parse(validMetadata);
      expect(result).toEqual(validMetadata);
    });

    it('should reject invalid domain', () => {
      const invalidMetadata = {
        ...validMetadata,
        domain: 'invalid-domain'
      };

      expect(() => DataSourceMetadataSchema.parse(invalidMetadata))
        .toThrow(/Domain must be one of/);
    });

    it('should reject invalid version format', () => {
      const invalidMetadata = {
        ...validMetadata,
        version: '1.0'
      };

      expect(() => DataSourceMetadataSchema.parse(invalidMetadata))
        .toThrow(/Version must follow semantic versioning/);
    });

    it('should reject invalid refresh interval', () => {
      const invalidMetadata = {
        ...validMetadata,
        refreshInterval: 500
      };

      expect(() => DataSourceMetadataSchema.parse(invalidMetadata))
        .toThrow(/Refresh interval must be at least 1000ms/);
    });

    it('should require mandatory fields', () => {
      const incompleteMetadata = {
        id: 'test',
        domain: 'transportation'
      };

      expect(() => DataSourceMetadataSchema.parse(incompleteMetadata))
        .toThrow();
    });

    it('should set default values for optional fields', () => {
      const minimalMetadata = {
        id: 'test-source',
        name: 'Test Source',
        domain: 'transportation',
        version: '1.0.0',
        description: 'A test data source',
        refreshInterval: 30000,
        reliability: 'high',
        author: 'Test Author',
        dataLicense: 'MIT'
      };

      const result = DataSourceMetadataSchema.parse(minimalMetadata);
      expect(result.tags).toEqual([]);
    });
  });

  describe('APIConfigurationSchema', () => {
    const validApiConfig = {
      type: 'json',
      baseUrl: 'https://api.example.com/data',
      authentication: {
        type: 'apikey',
        config: {
          key: 'api_key',
          value: 'secret'
        }
      },
      rateLimit: {
        requests: 100,
        window: 60000
      },
      timeout: 5000
    };

    it('should validate correct API configuration', () => {
      const result = APIConfigurationSchema.parse(validApiConfig);
      expect(result).toEqual(validApiConfig);
    });

    it('should reject invalid URL', () => {
      const invalidConfig = {
        ...validApiConfig,
        baseUrl: 'not-a-url'
      };

      expect(() => APIConfigurationSchema.parse(invalidConfig))
        .toThrow(/Base URL must be a valid URL/);
    });

    it('should reject invalid API type', () => {
      const invalidConfig = {
        ...validApiConfig,
        type: 'invalid-type'
      };

      expect(() => APIConfigurationSchema.parse(invalidConfig))
        .toThrow();
    });

    it('should set default timeout', () => {
      const configWithoutTimeout = {
        type: 'json',
        baseUrl: 'https://api.example.com/data'
      };

      const result = APIConfigurationSchema.parse(configWithoutTimeout);
      expect(result.timeout).toBe(10000);
    });

    it('should validate optional authentication', () => {
      const configWithoutAuth = {
        type: 'json',
        baseUrl: 'https://api.example.com/data'
      };

      const result = APIConfigurationSchema.parse(configWithoutAuth);
      expect(result.authentication).toBeUndefined();
    });
  });

  describe('DataSourceConfigSchema', () => {
    const validConfig = {
      metadata: {
        id: 'test-source',
        name: 'Test Source',
        domain: 'transportation',
        version: '1.0.0',
        description: 'A test data source',
        refreshInterval: 30000,
        reliability: 'high',
        tags: ['test'],
        author: 'Test Author',
        dataLicense: 'MIT'
      },
      api: {
        type: 'json',
        baseUrl: 'https://api.example.com/data'
      },
      transform: {
        strategy: 'json-to-geojson',
        mappings: {
          lat: 'latitude',
          lon: 'longitude',
          id: 'identifier'
        }
      },
      visualization: {
        layer: {
          type: 'circle',
          paint: {
            'circle-color': '#ff0000',
            'circle-radius': 5
          }
        },
        popup: {
          template: 'default'
        }
      },
      cache: {
        key: 'test-cache',
        ttl: 300000,
        storage: 'memory',
        invalidationRules: ['on-error']
      }
    };

    it('should validate complete configuration', () => {
      const result = DataSourceConfigSchema.parse(validConfig);
      expect(result).toEqual({
        ...validConfig,
        api: {
          ...validConfig.api,
          timeout: 10000 // Default value added by schema
        }
      });
    });

    it('should validate minimal configuration', () => {
      const minimalConfig = {
        metadata: validConfig.metadata,
        api: validConfig.api,
        transform: validConfig.transform
      };

      const result = DataSourceConfigSchema.parse(minimalConfig);
      expect(result.visualization).toBeUndefined();
      expect(result.cache).toBeUndefined();
    });
  });

  describe('validateDataSourceConfig', () => {
    const validConfig = {
      metadata: {
        id: 'test-source',
        name: 'Test Source',
        domain: 'transportation',
        version: '1.0.0',
        description: 'A test data source',
        refreshInterval: 30000,
        reliability: 'high',
        tags: ['test'],
        author: 'Test Author',
        dataLicense: 'MIT'
      },
      api: {
        type: 'json',
        baseUrl: 'https://api.example.com/data'
      },
      transform: {
        strategy: 'json-to-geojson',
        mappings: {
          lat: 'latitude',
          lon: 'longitude'
        }
      }
    };

    it('should validate correct configuration', () => {
      const result = validateDataSourceConfig(validConfig);
      expect(result).toEqual(expect.objectContaining({
        ...validConfig,
        api: {
          ...validConfig.api,
          timeout: 10000 // Default value added by schema
        }
      }));
    });

    it('should throw descriptive error for invalid configuration', () => {
      const invalidConfig = {
        ...validConfig,
        metadata: {
          ...validConfig.metadata,
          domain: 'invalid-domain'
        }
      };

      expect(() => validateDataSourceConfig(invalidConfig))
        .toThrow(/Configuration validation failed.*Domain must be one of/);
    });

    it('should handle missing required fields', () => {
      const incompleteConfig = {
        metadata: {
          id: 'test'
        }
      };

      expect(() => validateDataSourceConfig(incompleteConfig))
        .toThrow(/Configuration validation failed/);
    });
  });

  describe('Pre-defined Cache Strategies', () => {
    it('should have valid cache strategies', () => {
      expect(CACHE_STRATEGIES.REAL_TIME).toEqual({
        key: 'real-time',
        ttl: 30000,
        storage: 'memory',
        invalidationRules: ['on-error', 'on-stale']
      });

      expect(CACHE_STRATEGIES.SEMI_STATIC).toEqual({
        key: 'semi-static',
        ttl: 300000,
        storage: 'indexeddb',
        invalidationRules: ['daily', 'on-version-change']
      });

      expect(CACHE_STRATEGIES.STATIC).toEqual({
        key: 'static',
        ttl: 86400000,
        storage: 'indexeddb',
        invalidationRules: ['weekly']
      });
    });
  });
}); 