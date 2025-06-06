import { TTCVehicle, RoadRestriction, BikeStation, BeachWaterQuality } from '../types';
import { TTCService } from './ttcService';

export class DataService {
  private static instance: DataService;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private ttcService: TTCService;

  constructor() {
    this.ttcService = TTCService.getInstance();
  }

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  private async fetchFromCache<T>(key: string, fetcher: () => Promise<T>, ttl: number = 60000): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
    return data;
  }

  async fetchTTCVehicles(): Promise<TTCVehicle[]> {
    return this.fetchFromCache('ttc-vehicles', async () => {
      try {
        // Fetch real TTC data
        const realData = await this.ttcService.fetchRealTimeTTCVehicles();
        console.log(`Fetched ${realData.length} TTC vehicles from XML API`);
        return realData;
      } catch (error) {
        console.error('Failed to fetch TTC data:', error);
        return [];
      }
    }, 30000);
  }

  async fetchRoadRestrictions(): Promise<RoadRestriction[]> {
    return this.fetchFromCache('road-restrictions', async () => {
      // TODO: Implement real Toronto Open Data API for road restrictions
      console.warn('Road restrictions API not implemented - returning empty array');
      return [];
    }, 300000);
  }

  async fetchBikeStations(): Promise<BikeStation[]> {
    return this.fetchFromCache('bike-stations', async () => {
      // TODO: Implement real Toronto Open Data API for bike share stations
      console.warn('Bike stations API not implemented - returning empty array');
      return [];
    }, 60000);
  }

  async fetchBeachWaterQuality(): Promise<BeachWaterQuality[]> {
    return this.fetchFromCache('beach-water-quality', async () => {
      // TODO: Implement real Toronto Open Data API for beach water quality
      console.warn('Beach water quality API not implemented - returning empty array');
      return [];
    }, 3600000);
  }

  // Helper method to convert data to GeoJSON format
  toGeoJSON<T extends { latitude: number; longitude: number }>(
    data: T[],
    properties?: (item: T) => Record<string, any>
  ) {
    return {
      type: 'FeatureCollection' as const,
      features: data.map((item) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [item.longitude, item.latitude],
        },
        properties: {
          ...item,
          ...(properties ? properties(item) : {}),
        },
      })),
    };
  }

  clearCache(): void {
    this.cache.clear();
    this.ttcService.clearCache();
  }
} 