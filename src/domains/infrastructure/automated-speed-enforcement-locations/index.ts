import { BaseDataSourcePlugin } from '../../../core/data-sources/base-plugin.js';
import { DataSourceMetadata } from '../../../core/data-sources/types.js';
import { AutomatedSpeedEnforcementLocationsFetcher } from './fetcher.js';
import { AutomatedSpeedEnforcementLocationsTransformer } from './transformer.js';
import { AutomatedSpeedEnforcementLocationsValidator } from './validator.js';
import config from './config.json';

/**
 * Automated Speed Enforcement Locations Data Source Plugin
 * Automated Speed Enforcement (ASE) is an automated system that uses a camera and a speed measurement
device to detect and capture images of vehicles travelling in excess of the posted speed limit. It is designed to
work in tandem with other methods and strategies, including engineering measures, education initiatives and
traditional police enforcement. ASE is focused on altering driver behaviour to decrease speeding and increase
safety.

This dataset includes the active and planned locations of City of Toronto's Automated Speed Enforcement
systems by latitude and longitude.

For a list of historical locations, please visit the Automated Speed Enforcement website or contact us at the
email listed.
 */
export class AutomatedSpeedEnforcementLocationsPlugin extends BaseDataSourcePlugin {
  metadata: DataSourceMetadata = config.metadata;

  fetcher = new AutomatedSpeedEnforcementLocationsFetcher(config.api.baseUrl);
  transformer = new AutomatedSpeedEnforcementLocationsTransformer();
  validator = new AutomatedSpeedEnforcementLocationsValidator();

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

export default AutomatedSpeedEnforcementLocationsPlugin;