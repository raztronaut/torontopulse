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
    console.log('🏖️ Beach observations fetcher called with URL:', this.baseUrl);
    
    try {
      // Handle both absolute and relative URLs
      let url: URL;
      if (this.baseUrl.startsWith('http')) {
        // Absolute URL
        url = new URL(this.baseUrl);
      } else {
        // Relative URL - use current origin
        url = new URL(this.baseUrl, window.location.origin);
      }
      
      // Add parameters that might help get recent data
      url.searchParams.set('limit', '1000'); // Get more records to ensure we have recent data
      url.searchParams.set('sort', 'dataCollectionDate desc'); // Try to sort by date descending
      
      console.log('🏖️ Fetching beach observations from:', url.toString());
      
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TorontoPulse/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Beach observations data fetched:', {
        totalRecords: Array.isArray(data) ? data.length : data.result?.records?.length || 0,
        sampleRecord: Array.isArray(data) ? data[0] : data.result?.records?.[0]
      });
      
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch Toronto Beaches Observations data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}