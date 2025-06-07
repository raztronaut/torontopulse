import { DataFetcher } from '../../../core/data-sources/types.js';

/**
 * Fetcher for Road Restrictions
 * Road Restrictions data source for Toronto Pulse
 */
export class RoadRestrictionsFetcher implements DataFetcher {
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
      console.error(`Error fetching Road Restrictions data:`, error);
      throw error;
    }
  }
}