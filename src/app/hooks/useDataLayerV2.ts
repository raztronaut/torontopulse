import { useState, useEffect, useCallback, useMemo } from 'react';
import { GeoJSON } from 'geojson';
import { PluginDataService } from '../../core/data-sources/service';
import { DataSourceRegistry } from '../../core/data-sources/registry';
import { CacheManager } from '../../core/cache/strategies';
import { PluginLoader } from '../../core/data-sources/loader';

// Global instances for the new plugin system
let globalRegistry: DataSourceRegistry | null = null;
let globalCacheManager: CacheManager | null = null;
let globalPluginService: PluginDataService | null = null;
let globalPluginLoader: PluginLoader | null = null;
let pluginsLoaded = false;

const getGlobalServices = () => {
  if (!globalRegistry) {
    globalRegistry = new DataSourceRegistry();
  }
  if (!globalCacheManager) {
    globalCacheManager = new CacheManager();
  }
  if (!globalPluginService) {
    globalPluginService = new PluginDataService(globalRegistry, globalCacheManager);
  }
  if (!globalPluginLoader) {
    globalPluginLoader = new PluginLoader(globalRegistry);
  }
  
  return {
    registry: globalRegistry,
    cache: globalCacheManager,
    service: globalPluginService,
    loader: globalPluginLoader
  };
};

export function useDataLayerV2(
  layerId: string,
  enabled: boolean,
  refreshInterval?: number
) {
  const [geoJSON, setGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { service, loader } = useMemo(() => getGlobalServices(), []);

  // Load plugins on first use
  useEffect(() => {
    const loadPlugins = async () => {
      if (!pluginsLoaded) {
        try {
          console.log('Loading data source plugins...');
          await loader.loadAllPlugins();
          pluginsLoaded = true;
          console.log('✅ All plugins loaded successfully');
        } catch (error) {
          console.error('❌ Failed to load plugins:', error);
        }
      }
    };

    loadPlugins();
  }, [loader]);

  const fetchData = useCallback(async () => {
    console.log(`🔍 useDataLayerV2: fetchData called for ${layerId}, enabled: ${enabled}, pluginsLoaded: ${pluginsLoaded}`);
    
    if (!enabled || !pluginsLoaded) {
      console.log(`⏭️ useDataLayerV2: Skipping fetch for ${layerId} - enabled: ${enabled}, pluginsLoaded: ${pluginsLoaded}`);
      return;
    }
    
    console.log(`🚀 useDataLayerV2: Starting fetch for ${layerId}`);
    setLoading(true);
    setError(null);
    
    try {
      // Check if plugin exists
      if (!service.hasPlugin(layerId)) {
        throw new Error(`Plugin ${layerId} not found`);
      }

      console.log(`✅ useDataLayerV2: Plugin ${layerId} found, fetching data...`);
      const data = await service.fetchData(layerId);
      console.log(`✅ useDataLayerV2: Data fetched for ${layerId}, features: ${data.features?.length || 0}`);
      setGeoJSON(data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      console.error(`❌ useDataLayerV2: Error fetching ${layerId}:`, err);
    } finally {
      setLoading(false);
    }
  }, [layerId, enabled, service, pluginsLoaded]);

  // Initial fetch and refresh interval
  useEffect(() => {
    if (!enabled) {
      setGeoJSON(null);
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

  const invalidateCache = useCallback(async () => {
    try {
      await service.invalidateCache(layerId);
      fetchData();
    } catch (error) {
      console.error(`Failed to invalidate cache for ${layerId}:`, error);
    }
  }, [layerId, service, fetchData]);

  // Get plugin info for debugging
  const pluginInfo = useMemo(() => {
    const plugin = service.getPlugin(layerId);
    return plugin ? {
      name: plugin.metadata.name,
      version: plugin.metadata.version,
      domain: plugin.metadata.domain,
      reliability: plugin.metadata.reliability
    } : null;
  }, [layerId, service]);

  // Get metrics for debugging
  const metrics = useMemo(() => {
    return service.getMetrics(layerId);
  }, [layerId, service]);

  // Get health status
  const healthStatus = useMemo(() => {
    return service.getHealthStatus(layerId);
  }, [layerId, service]);

  return {
    geoJSON,
    loading,
    error,
    lastUpdated,
    refresh,
    invalidateCache,
    // Additional info for debugging and monitoring
    pluginInfo,
    metrics,
    healthStatus
  };
}

// Export global services for advanced usage
export const usePluginService = () => {
  const { service } = useMemo(() => getGlobalServices(), []);
  return service;
};

export const usePluginRegistry = () => {
  const { registry } = useMemo(() => getGlobalServices(), []);
  return registry;
};

export const usePluginLoader = () => {
  const { loader } = useMemo(() => getGlobalServices(), []);
  return loader;
}; 