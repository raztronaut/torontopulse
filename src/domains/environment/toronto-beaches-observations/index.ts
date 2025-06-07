import { BaseDataSourcePlugin } from '../../../core/data-sources/base-plugin.js';
import { DataSourceMetadata } from '../../../core/data-sources/types.js';
import { TorontoBeachesObservationsFetcher } from './fetcher.js';
import { TorontoBeachesObservationsTransformer } from './transformer.js';
import { TorontoBeachesObservationsValidator } from './validator.js';
import config from './config.json';

/**
 * Toronto Beaches Observations Data Source Plugin
 * Daily observations made by city staff on Toronto's beaches including temperature, turbidity, wave action, and wildlife counts
 */
export class TorontoBeachesObservationsPlugin extends BaseDataSourcePlugin {
  metadata: DataSourceMetadata = config.metadata;

  fetcher = new TorontoBeachesObservationsFetcher(
    config.api.baseUrl
  );

  transformer = new TorontoBeachesObservationsTransformer();
  validator = new TorontoBeachesObservationsValidator();

  async initialize(): Promise<void> {
    // Plugin-specific initialization logic
    console.log(`Initializing ${this.metadata.name} plugin...`);
  }

  async cleanup(): Promise<void> {
    // Plugin-specific cleanup logic
    console.log(`Cleaning up ${this.metadata.name} plugin...`);
  }
}

export default TorontoBeachesObservationsPlugin;