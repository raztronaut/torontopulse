import fs from 'fs-extra';
import path from 'path';
import { DatasetMetadata } from '../types.js';

export interface DataSourceConfig {
  pluginId: string;
  layerId: string;
  metadata: DatasetMetadata;
  domain: string;
  refreshInterval: number;
}

export class IntegrationService {
  async integrateDataSource(config: DataSourceConfig): Promise<void> {
    console.log(`🔗 Integrating plugin "${config.pluginId}" with layer "${config.layerId}"...`);

    await Promise.all([
      this.updateDataLayerHook(config),
      this.updatePluginLoader(config),
      this.updateLayerConfig(config),
      this.generateTypes(config)
    ]);

    // Check for legacy implementations
    await this.checkLegacyImplementations(config);
  }

  private async updateDataLayerHook(config: DataSourceConfig): Promise<void> {
    const hookPath = 'src/hooks/useDataLayer.ts';
    
    if (!await fs.pathExists(hookPath)) {
      console.warn(`⚠️  ${hookPath} not found - skipping layer mapping update`);
      return;
    }

    const content = await fs.readFile(hookPath, 'utf-8');
    const updatedContent = this.addLayerMapping(content, config.layerId, config.pluginId);
    
    if (content !== updatedContent) {
      await fs.writeFile(hookPath, updatedContent);
      console.log(`✅ Updated useDataLayer.ts with mapping: ${config.layerId} -> ${config.pluginId}`);
    } else {
      console.log(`ℹ️  Layer mapping already exists in useDataLayer.ts`);
    }
  }

  private async updatePluginLoader(config: DataSourceConfig): Promise<void> {
    const loaderPath = 'src/core/data-sources/loader.ts';
    
    if (!await fs.pathExists(loaderPath)) {
      console.warn(`⚠️  ${loaderPath} not found - creating basic loader`);
      await this.createBasicLoader();
    }

    const content = await fs.readFile(loaderPath, 'utf-8');
    const updatedContent = this.addPluginToLoader(content, config);
    
    if (content !== updatedContent) {
      await fs.writeFile(loaderPath, updatedContent);
      console.log(`✅ Updated plugin loader with: ${config.domain}/${config.pluginId}`);
    } else {
      console.log(`ℹ️  Plugin already registered in loader`);
    }
  }

  private async updateLayerConfig(config: DataSourceConfig): Promise<void> {
    const layerConfigPath = `src/config/layers/${config.layerId}.ts`;
    
    // Create layer config directory if it doesn't exist
    await fs.ensureDir(path.dirname(layerConfigPath));
    
    if (!await fs.pathExists(layerConfigPath)) {
      const layerConfig = this.generateLayerConfig(config);
      await fs.writeFile(layerConfigPath, layerConfig);
      console.log(`✅ Generated layer configuration: ${layerConfigPath}`);
    } else {
      console.log(`ℹ️  Layer configuration already exists: ${layerConfigPath}`);
    }
  }

  private async generateTypes(config: DataSourceConfig): Promise<void> {
    const typesPath = `src/domains/${config.domain}/${config.pluginId}/types`;
    
    if (!await fs.pathExists(typesPath)) {
      await fs.ensureDir(typesPath);
      
      // Generate raw API types
      const rawTypesContent = this.generateRawTypes(config);
      await fs.writeFile(path.join(typesPath, 'raw.ts'), rawTypesContent);
      
      // Generate GeoJSON type exports
      const geoJsonTypesContent = this.generateGeoJsonTypes();
      await fs.writeFile(path.join(typesPath, 'geojson.ts'), geoJsonTypesContent);
      
      console.log(`✅ Generated TypeScript helper types in types/ directory`);
    }
  }

  private async checkLegacyImplementations(config: DataSourceConfig): Promise<void> {
    const dataServicePath = 'src/services/dataService.ts';
    
    if (await fs.pathExists(dataServicePath)) {
      const content = await fs.readFile(dataServicePath, 'utf-8');
      const pascalCaseLayerId = this.toPascalCase(config.layerId);
      const pascalCaseName = this.toPascalCase(config.metadata.name);
      
      const legacyMethodPattern = new RegExp(
        `fetch${pascalCaseLayerId}|fetch${pascalCaseName}|${config.layerId}|${config.pluginId}`,
        'i'
      );
      
      if (legacyMethodPattern.test(content)) {
        console.warn(`⚠️  Legacy implementation detected in dataService.ts`);
        console.warn(`   Consider removing the old fetch method and updating integration tests`);
      }
    }
  }

  private addLayerMapping(content: string, layerId: string, pluginId: string): string {
    // Look for the getPluginId function
    const getPluginIdPattern = /const getPluginId = \(layerId: string\): string => \{([\s\S]*?)\};/;
    const match = content.match(getPluginIdPattern);
    
    if (!match) {
      // If getPluginId function doesn't exist, create it
      const newFunction = `
const getPluginId = (layerId: string): string => {
  switch (layerId) {
    case '${layerId}':
      return '${pluginId}';
    default:
      return layerId;
  }
};`;
      
      // Insert before the useDataLayer function
      return content.replace(
        /export function useDataLayer/,
        `${newFunction}\n\nexport function useDataLayer`
      );
    }
    
    const switchContent = match[1];
    
    // Check if mapping already exists
    if (switchContent.includes(`case '${layerId}':`)) {
      return content; // Already exists
    }
    
    // Add new case before default
    const newCase = `    case '${layerId}':\n      return '${pluginId}';`;
    const updatedSwitchContent = switchContent.replace(
      /(\s+default:)/,
      `\n${newCase}$1`
    );
    
    return content.replace(getPluginIdPattern, `const getPluginId = (layerId: string): string => {${updatedSwitchContent}};`);
  }

  private addPluginToLoader(content: string, config: DataSourceConfig): string {
    const pluginImportPath = `../../../domains/${config.domain}/${config.pluginId}/index.js`;
    const pluginClassName = this.toPascalCase(config.pluginId) + 'Plugin';
    
    // Add import if not exists
    const importStatement = `import { ${pluginClassName} } from '${pluginImportPath}';`;
    if (!content.includes(importStatement)) {
      content = content.replace(
        /(import.*from.*;\n)/g,
        `$1${importStatement}\n`
      );
    }
    
    // Add to knownPlugins array
    const knownPluginsPattern = /const knownPlugins: DataSourcePlugin\[\] = \[([\s\S]*?)\];/;
    const knownPluginsMatch = content.match(knownPluginsPattern);
    
    if (knownPluginsMatch) {
      const pluginsContent = knownPluginsMatch[1];
      const newPluginEntry = `  new ${pluginClassName}()`;
      
      if (!pluginsContent.includes(newPluginEntry)) {
        const updatedPluginsContent = pluginsContent.trim() 
          ? `${pluginsContent.trim()},\n${newPluginEntry}`
          : newPluginEntry;
        
        content = content.replace(
          knownPluginsPattern,
          `const knownPlugins: DataSourcePlugin[] = [\n${updatedPluginsContent}\n];`
        );
      }
    } else {
      // Create knownPlugins array if it doesn't exist
      const newArray = `
const knownPlugins: DataSourcePlugin[] = [
  new ${pluginClassName}()
];`;
      
      content = content.replace(
        /export class PluginLoader/,
        `${newArray}\n\nexport class PluginLoader`
      );
    }
    
    return content;
  }

  private generateLayerConfig(config: DataSourceConfig): string {
    const layerName = this.toTitleCase(config.layerId.replace(/-/g, ' '));
    const refreshIntervalMinutes = Math.round(config.refreshInterval / 60000);
    
    return `import { LayerConfig } from '../types.js';

export const ${this.toCamelCase(config.layerId)}LayerConfig: LayerConfig = {
  id: '${config.layerId}',
  name: '${layerName}',
  description: '${config.metadata.description}',
  enabled: true,
  refreshInterval: ${config.refreshInterval},
  metadata: {
    domain: '${config.domain}',
    dataType: '${config.metadata.dataType}',
    updateFrequency: '${config.metadata.updateFrequency}',
    reliability: 'high',
    tags: ${JSON.stringify(config.metadata.tags || [])},
    lastUpdated: new Date().toISOString()
  },
  visualization: {
    layer: {
      type: 'circle',
      paint: ${this.generatePaintConfig(config.domain, config.metadata.dataType)},
      layout: {}
    },
    popup: {
      template: '${config.layerId}-popup',
      fields: ${this.generatePopupFields(config.metadata)}
    }
  },
  zoom: {
    min: 8,
    max: 18,
    default: 11
  }
};`;
  }

  private generatePaintConfig(domain: string, dataType: string): string {
    const colors = {
      transportation: '#2563eb',
      infrastructure: '#dc2626',
      environment: '#059669',
      events: '#7c3aed'
    };
    
    const baseColor = colors[domain as keyof typeof colors] || '#6b7280';
    
    return JSON.stringify({
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        8, 4,
        12, 6,
        16, 8
      ],
      'circle-color': baseColor,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 0.8
    }, null, 6);
  }

  private generatePopupFields(metadata: DatasetMetadata): string {
    const fields = ['id', 'name'];
    
    // Add domain-specific fields
    if (metadata.geoFields?.length) {
      fields.push(...metadata.geoFields.slice(0, 2));
    }
    
    if (metadata.timeFields?.length) {
      fields.push(metadata.timeFields[0]);
    }
    
    // Add value fields (limit to 5 most relevant)
    if (metadata.valueFields?.length) {
      const relevantFields = metadata.valueFields
        .filter(f => !fields.includes(f.name))
        .slice(0, 5)
        .map(f => f.name);
      fields.push(...relevantFields);
    }
    
    return JSON.stringify(fields, null, 2);
  }

  private generateRawTypes(config: DataSourceConfig): string {
    return `// TODO: Define the structure of the raw API response
// Replace this placeholder with the actual API response interface

export interface RawApiResponse {
  // Describe the API response structure here
  // Example:
  // id: string;
  // name: string;
  // latitude: number;
  // longitude: number;
  // [key: string]: any;
}

export interface RawItem {
  // Describe individual data items here
  id: string;
  [key: string]: any;
}

// If the API returns nested data, describe the structure:
// export interface ApiWrapper {
//   result: {
//     records: RawItem[];
//   };
// }`;
  }

  private generateGeoJsonTypes(): string {
    return `// Re-export GeoJSON types for convenience
export type {
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  GeoJSONGeometry,
  GeoJSONPoint,
  GeoJSONProperties
} from '../../../../types/geojson.js';`;
  }

  private async createBasicLoader(): Promise<void> {
    const loaderContent = `import { DataSourcePlugin } from './types.js';
import { DataSourceRegistry } from './registry.js';

export class PluginLoader {
  private registry: DataSourceRegistry;

  constructor(registry: DataSourceRegistry) {
    this.registry = registry;
  }

  async loadAllPlugins(): Promise<void> {
    const knownPlugins: DataSourcePlugin[] = [
      // Plugins will be added here automatically
    ];

    for (const plugin of knownPlugins) {
      this.registry.register(plugin);
    }
  }

  async loadPlugin(pluginId: string): Promise<DataSourcePlugin | null> {
    return this.registry.get(pluginId) || null;
  }
}`;

    await fs.ensureDir('src/core/data-sources');
    await fs.writeFile('src/core/data-sources/loader.ts', loaderContent);
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  private toTitleCase(str: string): string {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
} 