import { BaseDataSourcePlugin } from '../../../core/data-sources/base-plugin';
import { DataSourceMetadata } from '../../../core/data-sources/types';
import { BikeShareTorontoFetcher } from './fetcher';
import { BikeShareTorontoTransformer } from './transformer';
import { BikeShareTorontoValidator } from './validator';
import config from './config.json';

/**
 * Bike Share Toronto Data Source Plugin
 * Bike Share Toronto data source for Toronto Pulse
 */
export class BikeShareTorontoPlugin extends BaseDataSourcePlugin {
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

  fetcher = new BikeShareTorontoFetcher();
  transformer = new BikeShareTorontoTransformer();
  validator = new BikeShareTorontoValidator();

  async onLoad(): Promise<void> {
    console.log(`Loading Bike Share Toronto plugin (${this.metadata.version})`);
  }

  async onEnable(): Promise<void> {
    console.log('Bike Share Toronto plugin enabled');
  }

  async onDisable(): Promise<void> {
    console.log('Bike Share Toronto plugin disabled');
  }

  async onUnload(): Promise<void> {
    console.log('Bike Share Toronto plugin unloaded');
  }
}

export default BikeShareTorontoPlugin;