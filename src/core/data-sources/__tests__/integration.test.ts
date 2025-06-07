import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataSourceRegistry } from '../registry';
import { PluginDataService } from '../service';
import { PluginLoader } from '../loader';
import { CacheManager } from '../../cache/strategies';

// Mock the TTC plugin to avoid actual API calls
vi.mock('../../../domains/transportation/ttc-vehicles/index.js', () => ({
  default: class MockTTCPlugin {
    metadata = {
      id: 'ttc-vehicles',
      name: 'TTC Live Vehicles',
      domain: 'transportation',
      version: '1.0.0',
      description: 'Mock TTC plugin for testing',
      refreshInterval: 30000,
      reliability: 'high',
      tags: ['transit', 'test'],
      author: 'Test',
      dataLicense: 'Test License'
    };

    fetcher = {
      fetch: vi.fn().mockResolvedValue([
        {
          id: 'test-vehicle-1',
          route: '501',
          route_name: 'Queen',
          direction: 'Eastbound',
          latitude: 43.6532,
          longitude: -79.3832,
          vehicle_type: 'streetcar',
          timestamp: new Date().toISOString()
        }
      ])
    };

    transformer = {
      transform: vi.fn().mockReturnValue({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [-79.3832, 43.6532]
            },
            properties: {
              layerId: 'ttc-vehicles',
              id: 'test-vehicle-1',
              route: '501',
              vehicle_type: 'streetcar'
            }
          }
        ]
      })
    };

    validator = {
      validate: vi.fn().mockReturnValue({
        valid: true,
        errors: [],
        data: [
          {
            id: 'test-vehicle-1',
            route: '501',
            route_name: 'Queen',
            direction: 'Eastbound',
            latitude: 43.6532,
            longitude: -79.3832,
            vehicle_type: 'streetcar',
            timestamp: new Date().toISOString()
          }
        ]
      })
    };

    async onLoad() {
      console.log('Mock TTC plugin loaded');
    }

    async onEnable() {
      console.log('Mock TTC plugin enabled');
    }

    async onDisable() {
      console.log('Mock TTC plugin disabled');
    }

    async onUnload() {
      console.log('Mock TTC plugin unloaded');
    }

    async fetchData() {
      const rawData = await this.fetcher.fetch();
      const validData = this.validator.validate(rawData);
      return this.transformer.transform(validData.data);
    }
  }
}));

describe('Plugin System Integration', () => {
  let registry: DataSourceRegistry;
  let cache: CacheManager;
  let service: PluginDataService;
  let loader: PluginLoader;

  beforeEach(() => {
    registry = new DataSourceRegistry();
    cache = new CacheManager();
    service = new PluginDataService(registry, cache);
    loader = new PluginLoader(registry);
  });

  it('should load and register plugins successfully', async () => {
    const plugins = await loader.loadAllPlugins();
    
    expect(plugins).toHaveLength(2);
    expect(plugins.find(p => p.metadata.id === 'ttc-vehicles')).toBeDefined();
    expect(plugins.find(p => p.metadata.id === 'bike-share-toronto')).toBeDefined();
    expect(registry.has('ttc-vehicles')).toBe(true);
    expect(registry.has('bike-share-toronto')).toBe(true);
  });

  it('should fetch data from loaded plugin', async () => {
    await loader.loadAllPlugins();
    
    const data = await service.fetchData('ttc-vehicles');
    
    expect(data.type).toBe('FeatureCollection');
    expect(data.features).toHaveLength(1);
    expect(data.features[0].properties.layerId).toBe('ttc-vehicles');
  });

  it('should handle plugin metrics', async () => {
    await loader.loadAllPlugins();
    await service.fetchData('ttc-vehicles');
    
    const metrics = service.getMetrics('ttc-vehicles');
    expect(metrics).toBeDefined();
    expect(metrics!.fetchCount).toBe(1);
    expect(metrics!.errorCount).toBe(0);
  });

  it('should provide health status', async () => {
    await loader.loadAllPlugins();
    await service.fetchData('ttc-vehicles');
    
    const health = service.getHealthStatus('ttc-vehicles');
    expect(health.status).toBe('healthy');
    expect(health.issues).toHaveLength(0);
  });

  it('should handle plugin unloading', async () => {
    await loader.loadAllPlugins();
    expect(registry.has('ttc-vehicles')).toBe(true);
    
    await loader.unloadPlugin('ttc-vehicles');
    expect(registry.has('ttc-vehicles')).toBe(false);
  });

  it('should handle cache invalidation', async () => {
    await loader.loadAllPlugins();
    
    // Fetch data to populate cache
    await service.fetchData('ttc-vehicles');
    
    // Invalidate cache
    await service.invalidateCache('ttc-vehicles');
    
    // Should still be able to fetch fresh data
    const data = await service.fetchData('ttc-vehicles');
    expect(data.type).toBe('FeatureCollection');
  });

  it('should filter plugins by domain', async () => {
    await loader.loadAllPlugins();
    
    const transportationPlugins = service.getPluginsByDomain('transportation');
    expect(transportationPlugins).toHaveLength(2);
    expect(transportationPlugins.find(p => p.metadata.id === 'ttc-vehicles')).toBeDefined();
    expect(transportationPlugins.find(p => p.metadata.id === 'bike-share-toronto')).toBeDefined();
    
    const infraPlugins = service.getPluginsByDomain('infrastructure');
    expect(infraPlugins).toHaveLength(0);
  });

  it('should filter plugins by tags', async () => {
    await loader.loadAllPlugins();
    
    const transitPlugins = service.getPluginsByTags(['transit']);
    expect(transitPlugins).toHaveLength(1);
    
    const weatherPlugins = service.getPluginsByTags(['weather']);
    expect(weatherPlugins).toHaveLength(0);
  });
}); 