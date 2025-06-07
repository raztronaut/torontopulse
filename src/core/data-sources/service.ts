import type { FeatureCollection } from 'geojson';
import { DataSourceRegistry } from './registry';
import { CacheManager } from '../cache/strategies';
import { DataSourcePlugin, DataSourceMetrics, HealthStatus } from './types';

export class PluginDataService {
  private registry: DataSourceRegistry;
  private cache: CacheManager;
  private metrics = new Map<string, DataSourceMetrics>();

  constructor(
    registry: DataSourceRegistry = new DataSourceRegistry(),
    cache: CacheManager = new CacheManager()
  ) {
    this.registry = registry;
    this.cache = cache;
  }

  async fetchData(pluginId: string): Promise<FeatureCollection> {
    const plugin = this.registry.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found in registry`);
    }

    const startTime = Date.now();
    let success = false;

    try {
      console.log(`Fetching data from plugin: ${plugin.metadata.name}`);
      
      const cacheKey = `plugin-data:${pluginId}`;
      
      const data = await this.cache.getOrFetch(
        cacheKey,
        () => plugin.fetchData(),
        plugin.metadata.refreshInterval,
        plugin.cacheStrategy?.storage || 'memory'
      ) as FeatureCollection;

      success = true;
      const duration = Date.now() - startTime;
      this.updateMetrics(pluginId, duration, success);
      
      console.log(`Successfully fetched data from ${plugin.metadata.name} in ${duration}ms`);
      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(pluginId, duration, success);
      
      console.error(`Failed to fetch data from ${plugin.metadata.name}:`, error);
      throw error;
    }
  }

  async fetchMultipleSources(pluginIds: string[]): Promise<Record<string, FeatureCollection>> {
    const results: Record<string, FeatureCollection> = {};
    
    const fetchPromises = pluginIds.map(async (pluginId) => {
      try {
        const data = await this.fetchData(pluginId);
        results[pluginId] = data;
      } catch (error) {
        console.error(`Failed to fetch data for ${pluginId}:`, error);
        // Don't include failed sources in results
      }
    });

    await Promise.allSettled(fetchPromises);
    return results;
  }

  async invalidateCache(pluginId: string): Promise<void> {
    const cacheKey = `plugin-data:${pluginId}`;
    await this.cache.invalidate(cacheKey);
    console.log(`Cache invalidated for plugin: ${pluginId}`);
  }

  async invalidateAllCache(): Promise<void> {
    await this.cache.clear();
    console.log('All cache cleared');
  }

  getPlugin(pluginId: string): DataSourcePlugin | undefined {
    return this.registry.get(pluginId);
  }

  getAllPlugins(): DataSourcePlugin[] {
    return this.registry.getAll();
  }

  getPluginsByDomain(domain: string): DataSourcePlugin[] {
    return this.registry.getByDomain(domain);
  }

  getPluginsByTags(tags: string[]): DataSourcePlugin[] {
    return this.registry.getByTags(tags);
  }

  hasPlugin(pluginId: string): boolean {
    return this.registry.has(pluginId);
  }

  getMetrics(pluginId: string): DataSourceMetrics | undefined {
    return this.metrics.get(pluginId);
  }

  getAllMetrics(): Map<string, DataSourceMetrics> {
    return new Map(this.metrics);
  }

  getHealthStatus(pluginId: string): HealthStatus {
    const plugin = this.registry.get(pluginId);
    if (!plugin) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        issues: ['Plugin not found']
      };
    }

    const metrics = this.metrics.get(pluginId);
    if (!metrics) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        issues: ['No metrics available']
      };
    }

    const errorRate = metrics.fetchCount > 0 ? metrics.errorCount / metrics.fetchCount : 0;
    const timeSinceLastSuccess = Date.now() - metrics.lastSuccessfulFetch.getTime();

    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (errorRate > 0.5) {
      issues.push('High error rate');
      status = 'unhealthy';
    } else if (errorRate > 0.2) {
      issues.push('Moderate error rate');
      status = 'degraded';
    }

    if (timeSinceLastSuccess > plugin.metadata.refreshInterval * 5) {
      issues.push('Stale data');
      status = 'unhealthy';
    } else if (timeSinceLastSuccess > plugin.metadata.refreshInterval * 2) {
      issues.push('Data may be stale');
      if (status === 'healthy') status = 'degraded';
    }

    if (metrics.avgResponseTime > 10000) {
      issues.push('Slow response times');
      if (status === 'healthy') status = 'degraded';
    }

    return {
      status,
      lastCheck: new Date(),
      issues
    };
  }

  getAllHealthStatus(): Record<string, HealthStatus> {
    const result: Record<string, HealthStatus> = {};
    for (const pluginId of this.registry.getAllIds()) {
      result[pluginId] = this.getHealthStatus(pluginId);
    }
    return result;
  }

  private updateMetrics(pluginId: string, duration: number, success: boolean): void {
    const existing = this.metrics.get(pluginId);
    
    if (existing) {
      existing.fetchCount++;
      if (!success) existing.errorCount++;
      existing.avgResponseTime = (existing.avgResponseTime + duration) / 2;
      if (success) existing.lastSuccessfulFetch = new Date();
    } else {
      this.metrics.set(pluginId, {
        sourceId: pluginId,
        fetchCount: 1,
        errorCount: success ? 0 : 1,
        avgResponseTime: duration,
        lastSuccessfulFetch: success ? new Date() : new Date(0),
        dataQualityScore: 1.0 // Will be enhanced later
      });
    }
  }

  // Registry management methods
  registerPlugin(plugin: DataSourcePlugin): void {
    this.registry.register(plugin);
    console.log(`Registered plugin: ${plugin.metadata.name}`);
  }

  unregisterPlugin(pluginId: string): boolean {
    const removed = this.registry.unregister(pluginId);
    if (removed) {
      this.metrics.delete(pluginId);
      console.log(`Unregistered plugin: ${pluginId}`);
    }
    return removed;
  }

  getRegistryStatus() {
    return this.registry.getRegistryStatus();
  }
} 