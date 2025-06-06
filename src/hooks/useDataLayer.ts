import { useState, useEffect, useCallback } from 'react';
import { DataService } from '../services/dataService';
import { TTCVehicle, RoadRestriction, BikeStation, BeachWaterQuality } from '../types';

export type LayerData = {
  'ttc-vehicles': TTCVehicle[];
  'road-restrictions': RoadRestriction[];
  'bike-share': BikeStation[];
  'beach-water-quality': BeachWaterQuality[];
};

export function useDataLayer<T extends keyof LayerData>(
  layerId: T,
  enabled: boolean,
  refreshInterval?: number
) {
  const [data, setData] = useState<LayerData[T] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const dataService = DataService.getInstance();

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let result: LayerData[T];
      
      switch (layerId) {
        case 'ttc-vehicles':
          result = await dataService.fetchTTCVehicles() as LayerData[T];
          break;
        case 'road-restrictions':
          result = await dataService.fetchRoadRestrictions() as LayerData[T];
          break;
        case 'bike-share':
          result = await dataService.fetchBikeStations() as LayerData[T];
          break;
        case 'beach-water-quality':
          result = await dataService.fetchBeachWaterQuality() as LayerData[T];
          break;
        default:
          throw new Error(`Unknown layer: ${layerId}`);
      }
      
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      console.error(`Error fetching ${layerId}:`, err);
    } finally {
      setLoading(false);
    }
  }, [layerId, enabled, dataService]);

  // Initial fetch and refresh interval
  useEffect(() => {
    if (!enabled) {
      setData(null);
      return;
    }

    fetchData();

    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [enabled, refreshInterval, fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const getGeoJSON = useCallback(() => {
    if (!data) return null;
    
    return dataService.toGeoJSON(
      data as any[],
      (item: any) => ({
        layerId,
        ...item,
      })
    );
  }, [data, dataService, layerId]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    geoJSON: getGeoJSON(),
  };
} 