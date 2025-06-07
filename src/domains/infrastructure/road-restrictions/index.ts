import { BaseDataSourcePlugin } from '../../../core/data-sources/base-plugin.js';
import { DataSourceMetadata } from '../../../core/data-sources/types.js';
import { RoadRestrictionsFetcher } from './fetcher.js';
import { RoadRestrictionsTransformer } from './transformer.js';
import { RoadRestrictionsValidator } from './validator.js';
import config from './config.json';

/**
 * Road Restrictions Data Source Plugin
 * Road Restrictions data source for Toronto Pulse
 */
export class RoadRestrictionsPlugin extends BaseDataSourcePlugin {
  metadata: DataSourceMetadata = config.metadata;

  fetcher = new RoadRestrictionsFetcher(config.api.baseUrl);
  transformer = new RoadRestrictionsTransformer();
  validator = new RoadRestrictionsValidator();

  async onLoad(): Promise<void> {
    console.log(`Loading ${this.metadata.name} plugin...`);
  }

  async onEnable(): Promise<void> {
    console.log(`Enabling ${this.metadata.name} plugin...`);
  }

  async onDisable(): Promise<void> {
    console.log(`Disabling ${this.metadata.name} plugin...`);
  }

  async onUnload(): Promise<void> {
    console.log(`Unloading ${this.metadata.name} plugin...`);
  }
}

export default RoadRestrictionsPlugin;