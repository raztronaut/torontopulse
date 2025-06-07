import { BaseDataSourcePlugin } from '../../../core/data-sources/base-plugin';
import { DataSourceMetadata } from '../../../core/data-sources/types';
import { TTCFetcher } from './fetcher';
import { TTCTransformer } from './transformer';
import { TTCValidator } from './validator';
import config from './config.json';

export class TTCVehiclesPlugin extends BaseDataSourcePlugin {
  metadata: DataSourceMetadata = {
    id: config.metadata.id,
    name: config.metadata.name,
    domain: config.metadata.domain,
    version: config.metadata.version,
    description: config.metadata.description,
    refreshInterval: config.metadata.refreshInterval,
    reliability: config.metadata.reliability as 'high' | 'medium' | 'low',
    tags: config.metadata.tags,
    author: config.metadata.author,
    dataLicense: config.metadata.dataLicense
  };

  fetcher = new TTCFetcher();
  transformer = new TTCTransformer();
  validator = new TTCValidator();

  // Plugin lifecycle hooks
  async onLoad(): Promise<void> {
    console.log(`[TTC Plugin] Loading ${this.metadata.name} v${this.metadata.version}`);
  }

  async onEnable(): Promise<void> {
    console.log(`[TTC Plugin] Enabled ${this.metadata.name}`);
  }

  async onDisable(): Promise<void> {
    console.log(`[TTC Plugin] Disabled ${this.metadata.name}`);
  }

  async onUnload(): Promise<void> {
    console.log(`[TTC Plugin] Unloading ${this.metadata.name}`);
  }
}

export default TTCVehiclesPlugin; 