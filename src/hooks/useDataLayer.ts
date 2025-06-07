import { useState, useEffect, useCallback } from 'react';
import { DataService } from '../services/dataService';
import { TTCVehicle, RoadRestriction, BikeStation, BeachWaterQuality } from '../types';
import { useDataLayerV2 } from '../app/hooks/useDataLayerV2';

export type LayerData = {
  'ttc-vehicles': TTCVehicle[];
  'road-restrictions': RoadRestriction[];
  'bike-share': BikeStation[];
  'beach-water-quality': BeachWaterQuality[];
  'toronto-beaches-observations': any[]; // Beach observation data
};

// Map layer IDs to plugin IDs
const getPluginId = (layerId: string): string => {
  switch (layerId) {
    case 'bike-share':
      return 'bike-share-toronto';
    case 'ttc-vehicles':
      return 'ttc-vehicles';
    case 'road-restrictions':
      return 'road-restrictions';
    case 'toronto-beaches-observations':
      return 'toronto-beaches-observations';
    default:
      return layerId;
  }
};

export function useDataLayer<T extends keyof LayerData>(
  layerId: T,
  enabled: boolean,
  refreshInterval?: number
) {
  // Try to use the new plugin system for supported layers
  const isPluginSupported = layerId === 'ttc-vehicles' || layerId === 'bike-share' || layerId === 'road-restrictions' || layerId === 'toronto-beaches-observations';
  
  // Use new plugin system for supported layers
  const pluginResult = useDataLayerV2(
    getPluginId(layerId as string), 
    enabled && isPluginSupported, 
    refreshInterval
  );

  // Legacy system state for unsupported layers
  const [data, setData] = useState<LayerData[T] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const dataService = DataService.getInstance();

  const fetchData = useCallback(async () => {
    if (!enabled || isPluginSupported) return; // Skip if using plugin system
    
    setLoading(true);
    setError(null);
    
    try {
      let result: LayerData[T];
      
      switch (layerId) {
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
  }, [layerId, enabled, dataService, isPluginSupported]);

  // Initial fetch and refresh interval for legacy system
  useEffect(() => {
    if (!enabled || isPluginSupported) {
      setData(null);
      return;
    }

    fetchData();

    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [enabled, refreshInterval, fetchData, isPluginSupported]);

  const refresh = useCallback(() => {
    if (isPluginSupported) {
      pluginResult.refresh();
    } else {
      fetchData();
    }
  }, [fetchData, isPluginSupported, pluginResult]);

  const getGeoJSON = useCallback(() => {
    if (isPluginSupported) {
      return pluginResult.geoJSON;
    }
    
    if (!data) return null;
    
    return dataService.toGeoJSON(
      data as any[],
      (item: any) => ({
        layerId,
        ...item,
      })
    );
  }, [data, dataService, layerId, isPluginSupported, pluginResult.geoJSON]);

  // Return the appropriate result based on whether we're using plugins
  if (isPluginSupported) {
    return {
      data: null, // Plugin system doesn't expose raw data
      loading: pluginResult.loading,
      error: pluginResult.error,
      lastUpdated: pluginResult.lastUpdated,
      refresh,
      geoJSON: pluginResult.geoJSON,
    };
  }

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    geoJSON: getGeoJSON(),
  };
} 