import { DataFetcher } from '../../../core/data-sources/types.js';

/**
 * Fetcher for Automated Speed Enforcement Locations
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
export class AutomatedSpeedEnforcementLocationsFetcher implements DataFetcher {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async fetch(): Promise<any> {
    try {
      const response = await fetch(this.baseUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Toronto Pulse Data Fetcher'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching Automated Speed Enforcement Locations data:`, error);
      throw error;
    }
  }
}