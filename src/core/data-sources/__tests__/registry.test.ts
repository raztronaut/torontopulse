import { describe, it, expect, beforeEach } from 'vitest';
import { DataSourceRegistry } from '../registry';
import { DataSourcePlugin, DataSourceMetadata } from '../types';

// Mock plugin for testing
class MockPlugin implements DataSourcePlugin {
  metadata: DataSourceMetadata;
  fetcher = { fetch: async () => ({}) };
  transformer = { transform: async () => ({ type: 'FeatureCollection' as const, features: [] }) };
  validator = { validate: (data: any) => data };

  constructor(id: string, domain: string = 'transportation') {
    this.metadata = {
      id,
      name: `Mock ${id}`,
      domain,
      version: '1.0.0',
      description: `Mock plugin for ${id}`,
      refreshInterval: 30000,
      reliability: 'high',
      tags: ['test'],
      author: 'Test Author',
      dataLicense: 'Test License'
    };
  }
}

describe('DataSourceRegistry', () => {
  let registry: DataSourceRegistry;

  beforeEach(() => {
    registry = new DataSourceRegistry();
  });

  describe('Registration', () => {
    it('should register a plugin', () => {
      const plugin = new MockPlugin('test-plugin');
      registry.register(plugin);

      expect(registry.has('test-plugin')).toBe(true);
      expect(registry.get('test-plugin')).toBe(plugin);
      expect(registry.count()).toBe(1);
    });

    it('should unregister a plugin', () => {
      const plugin = new MockPlugin('test-plugin');
      registry.register(plugin);
      
      const removed = registry.unregister('test-plugin');
      
      expect(removed).toBe(true);
      expect(registry.has('test-plugin')).toBe(false);
      expect(registry.count()).toBe(0);
    });

    it('should return false when unregistering non-existent plugin', () => {
      const removed = registry.unregister('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('Retrieval', () => {
    beforeEach(() => {
      registry.register(new MockPlugin('transport-1', 'transportation'));
      registry.register(new MockPlugin('transport-2', 'transportation'));
      registry.register(new MockPlugin('infra-1', 'infrastructure'));
      registry.register(new MockPlugin('env-1', 'environment'));
    });

    it('should get all plugins', () => {
      const plugins = registry.getAll();
      expect(plugins).toHaveLength(4);
    });

    it('should get plugins by domain', () => {
      const transportPlugins = registry.getByDomain('transportation');
      expect(transportPlugins).toHaveLength(2);
      expect(transportPlugins.every(p => p.metadata.domain === 'transportation')).toBe(true);

      const infraPlugins = registry.getByDomain('infrastructure');
      expect(infraPlugins).toHaveLength(1);
    });

    it('should get plugins by tags', () => {
      const testPlugins = registry.getByTags(['test']);
      expect(testPlugins).toHaveLength(4);

      const nonExistentTagPlugins = registry.getByTags(['non-existent']);
      expect(nonExistentTagPlugins).toHaveLength(0);
    });

    it('should get plugins by reliability', () => {
      const highReliabilityPlugins = registry.getByReliability('high');
      expect(highReliabilityPlugins).toHaveLength(4);

      const lowReliabilityPlugins = registry.getByReliability('low');
      expect(lowReliabilityPlugins).toHaveLength(0);
    });

    it('should get all domains', () => {
      const domains = registry.getDomains();
      expect(domains).toContain('transportation');
      expect(domains).toContain('infrastructure');
      expect(domains).toContain('environment');
      expect(domains).toHaveLength(3);
    });

    it('should get all IDs', () => {
      const ids = registry.getAllIds();
      expect(ids).toContain('transport-1');
      expect(ids).toContain('transport-2');
      expect(ids).toContain('infra-1');
      expect(ids).toContain('env-1');
      expect(ids).toHaveLength(4);
    });
  });

  describe('Status', () => {
    it('should return correct registry status', () => {
      registry.register(new MockPlugin('transport-1', 'transportation'));
      registry.register(new MockPlugin('transport-2', 'transportation'));
      registry.register(new MockPlugin('infra-1', 'infrastructure'));

      const status = registry.getRegistryStatus();
      
      expect(status.totalSources).toBe(3);
      expect(status.domains).toContain('transportation');
      expect(status.domains).toContain('infrastructure');
      expect(status.sourcesByDomain.transportation).toBe(2);
      expect(status.sourcesByDomain.infrastructure).toBe(1);
      expect(status.sourceIds).toHaveLength(3);
    });

    it('should handle empty registry', () => {
      const status = registry.getRegistryStatus();
      
      expect(status.totalSources).toBe(0);
      expect(status.domains).toHaveLength(0);
      expect(status.sourceIds).toHaveLength(0);
    });
  });

  describe('Clear', () => {
    it('should clear all plugins', () => {
      registry.register(new MockPlugin('test-1'));
      registry.register(new MockPlugin('test-2'));
      
      expect(registry.count()).toBe(2);
      
      registry.clear();
      
      expect(registry.count()).toBe(0);
      expect(registry.getAll()).toHaveLength(0);
    });
  });
}); 