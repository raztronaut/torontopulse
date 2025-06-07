import { DataFetcher } from '../../../core/data-sources/types.js';

/**
 * Fetcher for Red Light Cameras
 * Red Light Camera (RLC) is an automated system which photographs vehicles that run red lights. Generally, the camera is triggered when a vehicle enters the intersection (passes the stop-bar) after the traffic signal has turned red. The camera will take two time-stamped photographs of the vehicle: one is taken as the vehicle approaches the stop line and the second is taken as the vehicle moves through the intersection. RLC is focused on altering driver behaviour to eliminate red-light running and increase safety for all road users. 

This dataset identifies the intersections in Toronto where Red Light Cameras are located.

For a list of historical (including de-commissioned) locations, please visit the Red Light Camera website or contact us at the email listed.


 */
export class RedLightCamerasFetcher implements DataFetcher {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async fetch(): Promise<any> {
    console.log(`🔍 Red Light Cameras Fetcher: Starting fetch from ${this.baseUrl}`);
    
    try {
      const response = await fetch(this.baseUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Toronto Pulse Data Fetcher'
        }
      });

      console.log(`📡 Red Light Cameras Fetcher: Response status ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Red Light Cameras Fetcher: Successfully fetched data with ${data?.result?.records?.length || 'unknown'} records`);
      
      return data;
    } catch (error) {
      console.error(`❌ Red Light Cameras Fetcher: Error fetching data:`, error);
      throw error;
    }
  }
}