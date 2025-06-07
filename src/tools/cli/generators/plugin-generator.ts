import fs from 'fs-extra';
import path from 'path';
import { PluginConfig } from '../types.js';

export async function generatePlugin(config: PluginConfig): Promise<void> {
  const pluginName = kebabCase(config.name);
  const pluginPath = path.join('src', 'domains', config.domain, pluginName);
  
  // Create directory structure
  await fs.ensureDir(pluginPath);
  
  // Generate config.json
  await generateConfigFile(pluginPath, config);
  
  // Generate plugin files
  await generateFetcherFile(pluginPath, config);
  await generateTransformerFile(pluginPath, config);
  await generateValidatorFile(pluginPath, config);
  await generateIndexFile(pluginPath, config);
  
  // Generate TypeScript helper types (raw API response + GeoJSON)
  await generateTypesFiles(pluginPath, config);
  
  if (config.includeTests) {
    await generateTestFile(pluginPath, config);
  }
  
  // Generate README
  await generateReadmeFile(pluginPath, config);
}

async function generateConfigFile(pluginPath: string, config: PluginConfig): Promise<void> {
  const pluginId = kebabCase(config.name);
  const configData = {
    metadata: {
      id: pluginId,
      name: config.name,
      domain: config.domain,
      version: "1.0.0",
      description: config.description,
      refreshInterval: config.refreshInterval,
      reliability: config.reliability,
      tags: config.tags,
      author: config.author,
      dataLicense: config.dataLicense
    },
    api: {
      type: config.apiType,
      baseUrl: config.apiUrl,
      authentication: null,
      rateLimit: {
        requests: 60,
        window: 60000
      },
      timeout: 10000
    },
    transform: {
      strategy: `${config.apiType}-to-geojson`,
      mappings: getDefaultMappings(config.apiType)
    },
    visualization: {
      layer: {
        type: "circle",
        paint: {
          "circle-radius": 6,
          "circle-color": getDefaultColor(config.domain),
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff"
        }
      },
      popup: {
        template: `${pluginId}-popup`
      }
    },
    cache: {
      strategy: config.refreshInterval <= 60000 ? "real-time" : "semi-static",
      ttl: config.refreshInterval,
      storage: "memory"
    }
  };

  await fs.writeJSON(path.join(pluginPath, 'config.json'), configData, { spaces: 2 });
}

async function generateFetcherFile(pluginPath: string, config: PluginConfig): Promise<void> {
  const className = pascalCase(config.name) + 'Fetcher';
  const content = `import { DataFetcher } from '../../../core/data-sources/types.js';

/**
 * Fetcher for ${config.name}
 * ${config.description}
 */
export class ${className} implements DataFetcher {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async fetch(): Promise<any> {
    try {
      const response = await fetch(this.baseUrl, {
        headers: {
          'Accept': '${getContentType(config.apiType)}',
          'User-Agent': 'Toronto Pulse Data Fetcher'
        }
      });

      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }

      ${getFetchResponseHandler(config.apiType)}
    } catch (error) {
      console.error(\`Error fetching ${config.name} data:\`, error);
      throw error;
    }
  }
}`;

  await fs.writeFile(path.join(pluginPath, 'fetcher.ts'), content);
}

async function generateTransformerFile(pluginPath: string, config: PluginConfig): Promise<void> {
  const className = pascalCase(config.name) + 'Transformer';
  const content = `import { DataTransformer } from '../../../core/data-sources/types.js';
import { GeoJSONFeatureCollection, GeoJSONFeature } from '../../../types/geojson.js';

/**
 * Transformer for ${config.name}
 * Converts ${config.apiType.toUpperCase()} data to GeoJSON format
 */
export class ${className} implements DataTransformer {
  transform(data: any): GeoJSONFeatureCollection {
    try {
      ${getTransformLogic(config.apiType, config.arrayProperty)}
    } catch (error) {
      console.error(\`Error transforming ${config.name} data:\`, error);
      throw error;
    }
  }

  private createFeature(item: any): GeoJSONFeature {
    // TODO: Implement feature creation based on your data structure
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          item.longitude || item.lon || item.lng,
          item.latitude || item.lat
        ]
      },
      properties: {
        id: item.id,
        name: item.name || item.title,
        // Add more properties as needed
        ...item
      }
    };
  }
}`;

  await fs.writeFile(path.join(pluginPath, 'transformer.ts'), content);
}

async function generateValidatorFile(pluginPath: string, config: PluginConfig): Promise<void> {
  const className = pascalCase(config.name) + 'Validator';
  const content = `import { DataValidator, ValidationResult } from '../../../core/data-sources/types.js';

/**
 * Validator for ${config.name}
 * Ensures data quality and geographic bounds for Toronto area
 */
export class ${className} implements DataValidator {
  // Toronto bounding box (approximately)
  private readonly TORONTO_BOUNDS = {
    north: 43.85,
    south: 43.58,
    east: -79.12,
    west: -79.64
  };

  validate(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate data structure
      if (!data) {
        errors.push('Data is null or undefined');
        return { valid: false, errors, warnings };
      }

      ${getValidationLogic(config.apiType, config.arrayProperty)}

      // Validate geographic coordinates if present
      this.validateGeographicData(data, warnings);

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push(\`Validation error: \${error}\`);
      return { valid: false, errors, warnings };
    }
  }

  private validateGeographicData(data: any, warnings: string[]): void {
    // TODO: Implement geographic validation based on your data structure
    // This is a placeholder - adapt to your specific data format
    
    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        const lat = item.latitude || item.lat;
        const lon = item.longitude || item.lon || item.lng;
        
        if (lat && lon) {
          if (!this.isInTorontoBounds(lat, lon)) {
            warnings.push(\`Item \${index}: coordinates (\${lat}, \${lon}) outside Toronto bounds\`);
          }
        }
      });
    }
  }

  private isInTorontoBounds(lat: number, lon: number): boolean {
    return lat >= this.TORONTO_BOUNDS.south &&
           lat <= this.TORONTO_BOUNDS.north &&
           lon >= this.TORONTO_BOUNDS.west &&
           lon <= this.TORONTO_BOUNDS.east;
  }
}`;

  await fs.writeFile(path.join(pluginPath, 'validator.ts'), content);
}

async function generateIndexFile(pluginPath: string, config: PluginConfig): Promise<void> {
  const className = pascalCase(config.name) + 'Plugin';
  const fetcherClass = pascalCase(config.name) + 'Fetcher';
  const transformerClass = pascalCase(config.name) + 'Transformer';
  const validatorClass = pascalCase(config.name) + 'Validator';
  
  const content = `import { BaseDataSourcePlugin } from '../../../core/data-sources/base-plugin.js';
import { DataSourceMetadata } from '../../../core/data-sources/types.js';
import { ${fetcherClass} } from './fetcher.js';
import { ${transformerClass} } from './transformer.js';
import { ${validatorClass} } from './validator.js';
import config from './config.json';

/**
 * ${config.name} Data Source Plugin
 * ${config.description}
 */
export class ${className} extends BaseDataSourcePlugin {
  metadata: DataSourceMetadata = config.metadata;

  fetcher = new ${fetcherClass}(config.api.baseUrl);
  transformer = new ${transformerClass}();
  validator = new ${validatorClass}();

  async onLoad(): Promise<void> {
    console.log(\`Loading \${this.metadata.name} plugin...\`);
  }

  async onEnable(): Promise<void> {
    console.log(\`Enabling \${this.metadata.name} plugin...\`);
  }

  async onDisable(): Promise<void> {
    console.log(\`Disabling \${this.metadata.name} plugin...\`);
  }

  async onUnload(): Promise<void> {
    console.log(\`Unloading \${this.metadata.name} plugin...\`);
  }
}

export default ${className};`;

  await fs.writeFile(path.join(pluginPath, 'index.ts'), content);
}

async function generateTestFile(pluginPath: string, config: PluginConfig): Promise<void> {
  const className = pascalCase(config.name) + 'Plugin';
  const content = `import { describe, it, expect, beforeEach } from 'vitest';
import { ${className} } from './index.js';

describe('${className}', () => {
  let plugin: ${className};

  beforeEach(() => {
    plugin = new ${className}();
  });

  describe('Plugin Metadata', () => {
    it('should have correct metadata', () => {
      expect(plugin.metadata.id).toBe('${kebabCase(config.name)}');
      expect(plugin.metadata.name).toBe('${config.name}');
      expect(plugin.metadata.domain).toBe('${config.domain}');
      expect(plugin.metadata.reliability).toBe('${config.reliability}');
    });
  });

  describe('Plugin Components', () => {
    it('should have fetcher instance', () => {
      expect(plugin.fetcher).toBeDefined();
    });

    it('should have transformer instance', () => {
      expect(plugin.transformer).toBeDefined();
    });

    it('should have validator instance', () => {
      expect(plugin.validator).toBeDefined();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch data successfully', async () => {
      // TODO: Mock the API call and test data fetching
      // const data = await plugin.fetcher.fetch();
      // expect(data).toBeDefined();
    });
  });

  describe('Data Transformation', () => {
    it('should transform data to GeoJSON', async () => {
      // TODO: Test data transformation with sample data
      // const sampleData = { /* sample data */ };
      // const geoJson = plugin.transformer.transform(sampleData);
      // expect(geoJson.type).toBe('FeatureCollection');
      // expect(geoJson.features).toBeInstanceOf(Array);
    });
  });

  describe('Data Validation', () => {
    it('should validate data structure', async () => {
      // TODO: Test data validation with various inputs
      // const sampleData = { /* sample data */ };
      // const result = plugin.validator.validate(sampleData);
      // expect(result.valid).toBe(true);
    });
  });

  describe('Plugin Lifecycle', () => {
    it('should handle lifecycle events', async () => {
      await expect(plugin.onLoad()).resolves.not.toThrow();
      await expect(plugin.onEnable()).resolves.not.toThrow();
      await expect(plugin.onDisable()).resolves.not.toThrow();
      await expect(plugin.onUnload()).resolves.not.toThrow();
    });
  });
});`;

  await fs.writeFile(path.join(pluginPath, 'test.spec.ts'), content);
}

async function generateReadmeFile(pluginPath: string, config: PluginConfig): Promise<void> {
  const content = `# ${config.name} Data Source

${config.description}

## Configuration

- **Domain**: ${config.domain}
- **API Type**: ${config.apiType.toUpperCase()}
- **Refresh Interval**: ${config.refreshInterval / 1000} seconds
- **Reliability**: ${config.reliability}

## API Details

- **Endpoint**: ${config.apiUrl}
- **Format**: ${config.apiType.toUpperCase()}

## Development

### Testing

\`\`\`bash
npm run tp test:datasource ${kebabCase(config.name)}
\`\`\`

### Implementation Notes

1. **Fetcher**: Implement the data fetching logic in \`fetcher.ts\`
2. **Transformer**: Convert the API response to GeoJSON in \`transformer.ts\`
3. **Validator**: Add data quality checks in \`validator.ts\`

### TODO

- [ ] Implement fetcher logic for ${config.apiType.toUpperCase()} API
- [ ] Map API fields to GeoJSON properties in transformer
- [ ] Add specific validation rules for data quality
- [ ] Write comprehensive tests
- [ ] Add error handling and retry logic

## Tags

${config.tags.join(', ')}
`;

  await fs.writeFile(path.join(pluginPath, 'README.md'), content);
}

// Helper functions
function kebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function pascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function getDefaultMappings(apiType: string): Record<string, string> {
  switch (apiType) {
    case 'json':
      return {
        latitude: "$.lat",
        longitude: "$.lon",
        id: "$.id",
        name: "$.name"
      };
    case 'xml':
      return {
        latitude: "@lat",
        longitude: "@lon",
        id: "@id",
        name: "@name"
      };
    case 'csv':
      return {
        latitude: "latitude",
        longitude: "longitude",
        id: "id",
        name: "name"
      };
    default:
      return {
        latitude: "latitude",
        longitude: "longitude",
        id: "id"
      };
  }
}

function getDefaultColor(domain: string): string {
  switch (domain) {
    case 'transportation': return '#2563eb';
    case 'infrastructure': return '#dc2626';
    case 'environment': return '#16a34a';
    case 'events': return '#ea580c';
    default: return '#6b7280';
  }
}

function getContentType(apiType: string): string {
  switch (apiType) {
    case 'json': return 'application/json';
    case 'xml': return 'application/xml';
    case 'csv': return 'text/csv';
    default: return 'application/json';
  }
}

function getFetchResponseHandler(apiType: string): string {
  switch (apiType) {
    case 'json':
      return 'return await response.json();';
    case 'xml':
      return 'return await response.text();';
    case 'csv':
      return 'return await response.text();';
    default:
      return 'return await response.json();';
  }
}

function getTransformLogic(apiType: string, arrayProp?: string): string {
  const arrayExtraction = arrayProp
    ? `      // Extract nested array if required
      let items: any = data;
      if (typeof data === 'object' && !Array.isArray(data)) {
        items = data['${arrayProp}'];
      }

      if (!Array.isArray(items)) {
        throw new Error('Expected array of items inside property "${arrayProp}"');
      }

      const features = items.map(item => this.createFeature(item));

      return {
        type: 'FeatureCollection',
        features
      };`
    : `      if (!Array.isArray(data)) {
        throw new Error('Expected array of items');
      }

      const features = data.map(item => this.createFeature(item));

      return {
        type: 'FeatureCollection',
        features
      };`;

  switch (apiType) {
    case 'json':
      return arrayExtraction;
    case 'xml':
      return `      // TODO: Parse XML data and convert to array
      // You may want to use xml2js or similar library
      const items = []; // Parse XML here
      
      const features = items.map(item => this.createFeature(item));

      return {
        type: 'FeatureCollection',
        features
      };`;
    case 'csv':
      return `      // TODO: Parse CSV data and convert to array
      // You may want to use csv-parse or similar library
      const items = []; // Parse CSV here
      
      const features = items.map(item => this.createFeature(item));

      return {
        type: 'FeatureCollection',
        features
      };`;
    default:
      return arrayExtraction;
  }
}

function getValidationLogic(apiType: string, arrayProp?: string): string {
  const arrayCheck = arrayProp
    ? `      if (typeof data === 'object' && !Array.isArray(data)) {
        data = data['${arrayProp}'];
      }

      if (!Array.isArray(data)) {
        errors.push('Expected array of items inside property "${arrayProp}"');
        return { valid: false, errors, warnings };
      }

      if (data.length === 0) {
        warnings.push('Data array is empty');
      }`
    : `      if (!Array.isArray(data)) {
        errors.push('Expected array of items');
        return { valid: false, errors, warnings };
      }

      if (data.length === 0) {
        warnings.push('Data array is empty');
      }`;

  switch (apiType) {
    case 'json':
      return arrayCheck;
    case 'xml':
      return `      if (typeof data !== 'string') {
        errors.push('Expected XML string');
        return { valid: false, errors, warnings };
      }

      if (data.trim().length === 0) {
        errors.push('XML data is empty');
        return { valid: false, errors, warnings };
      }`;
    case 'csv':
      return `      if (typeof data !== 'string') {
        errors.push('Expected CSV string');
        return { valid: false, errors, warnings };
      }

      if (data.trim().length === 0) {
        errors.push('CSV data is empty');
        return { valid: false, errors, warnings };
      }`;
    default:
      return `      // TODO: Add validation logic for your data format`;
  }
}

/**
 * Generates minimal TypeScript helper types inside the plugin directory to encourage strong typing in fetcher, transformer and validator.
 */
async function generateTypesFiles(pluginPath: string, _config: PluginConfig): Promise<void> {
  const typesDir = path.join(pluginPath, 'types');
  await fs.ensureDir(typesDir);

  // raw.ts – placeholder for developers to fill in
  const rawContent = `// Auto-generated by CLI – Adjust this interface to match the raw API shape
export interface RawItem {
  // TODO: Describe the fields returned by the API
  // id: string;
}

export type RawApiResponse = RawItem[] | Record<string, any>;
`;

  // geojson.ts – re-export global geojson helpers for convenience
  const geoJsonContent = `export { GeoJSONFeature, GeoJSONFeatureCollection } from '../../../../types/geojson.js';
`;

  await fs.writeFile(path.join(typesDir, 'raw.ts'), rawContent);
  await fs.writeFile(path.join(typesDir, 'geojson.ts'), geoJsonContent);
} 