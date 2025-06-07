import { BaseDataSourcePlugin } from '../../../core/data-sources/base-plugin.js';
import { DataSourceMetadata } from '../../../core/data-sources/types.js';
import { RedLightCamerasFetcher } from './fetcher.js';
import { RedLightCamerasTransformer } from './transformer.js';
import { RedLightCamerasValidator } from './validator.js';
import config from './config.json';

/**
 * Red Light Cameras Data Source Plugin
 * Red Light Camera (RLC) is an automated system which photographs vehicles that run red lights. Generally, the camera is triggered when a vehicle enters the intersection (passes the stop-bar) after the traffic signal has turned red. The camera will take two time-stamped photographs of the vehicle: one is taken as the vehicle approaches the stop line and the second is taken as the vehicle moves through the intersection. RLC is focused on altering driver behaviour to eliminate red-light running and increase safety for all road users. 

This dataset identifies the intersections in Toronto where Red Light Cameras are located.

For a list of historical (including de-commissioned) locations, please visit the Red Light Camera website or contact us at the email listed.


 */
export class RedLightCamerasPlugin extends BaseDataSourcePlugin {
  metadata: DataSourceMetadata = config.metadata;

  fetcher = new RedLightCamerasFetcher(config.api.baseUrl);
  transformer = new RedLightCamerasTransformer();
  validator = new RedLightCamerasValidator();

  async onLoad(): Promise<void> {
    console.log(`🚀 Loading ${this.metadata.name} plugin...`);
  }

  async onEnable(): Promise<void> {
    console.log(`🟢 Enabling ${this.metadata.name} plugin...`);
  }

  async onDisable(): Promise<void> {
    console.log(`🔴 Disabling ${this.metadata.name} plugin...`);
  }

  async onUnload(): Promise<void> {
    console.log(`🗑️ Unloading ${this.metadata.name} plugin...`);
  }
}

export default RedLightCamerasPlugin;