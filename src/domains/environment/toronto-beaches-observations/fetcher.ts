import { DataFetcher } from '../../../core/data-sources/types.js';

/**
 * Fetcher for Toronto Beaches Observations
 * Daily observations made by city staff on Toronto's beaches including temperature, turbidity, wave action, and wildlife counts
 */
export class TorontoBeachesObservationsFetcher implements DataFetcher {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async fetch(): Promise<any> {
    try {
      const response = await fetch(this.baseUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TorontoPulse/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch Toronto Beaches Observations data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}