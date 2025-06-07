import type { FeatureCollection } from 'geojson';
import { 
  DataSourcePlugin, 
  DataSourceMetadata, 
  DataFetcher, 
  DataTransformer, 
  DataValidator,
  CacheStrategy 
} from './types';

export abstract class BaseDataSourcePlugin implements DataSourcePlugin {
  abstract metadata: DataSourceMetadata;
  abstract fetcher: DataFetcher;
  abstract transformer: DataTransformer;
  abstract validator: DataValidator;
  
  cacheStrategy?: CacheStrategy;

  async fetchData(): Promise<FeatureCollection> {
    try {
      console.log(`Fetching data for ${this.metadata.name}...`);
      const rawData = await this.fetcher.fetch();
      
      console.log(`Transforming data for ${this.metadata.name}...`);
      const transformedData = await this.transformer.transform(rawData);
      
      console.log(`Validating data for ${this.metadata.name}...`);
      const validationResult = this.validator.validate(transformedData);
      
      if (!validationResult.valid) {
        console.warn(`Validation warnings for ${this.metadata.name}:`, validationResult.errors);
      }
      
      console.log(`Successfully processed data for ${this.metadata.name}`);
      return transformedData;
    } catch (error) {
      console.error(`Error processing data for ${this.metadata.name}:`, error);
      throw error;
    }
  }

  // Lifecycle hooks that can be overridden by specific plugins
  async onLoad(): Promise<void> {
    console.log(`Plugin ${this.metadata.name} loaded`);
  }

  async onEnable(): Promise<void> {
    console.log(`Plugin ${this.metadata.name} enabled`);
  }

  async onDisable(): Promise<void> {
    console.log(`Plugin ${this.metadata.name} disabled`);
  }

  async onUnload(): Promise<void> {
    console.log(`Plugin ${this.metadata.name} unloaded`);
  }

  // Helper method to get plugin info
  getInfo(): {
    id: string;
    name: string;
    domain: string;
    version: string;
    reliability: string;
  } {
    return {
      id: this.metadata.id,
      name: this.metadata.name,
      domain: this.metadata.domain,
      version: this.metadata.version,
      reliability: this.metadata.reliability
    };
  }

  // Helper method to check if plugin is compatible with a certain version
  isCompatibleWith(version: string): boolean {
    // Simple version compatibility check - can be enhanced later
    return this.metadata.version === version;
  }
} 