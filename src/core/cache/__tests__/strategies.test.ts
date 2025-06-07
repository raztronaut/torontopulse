import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManager, CacheStrategy } from '../strategies';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager();
    // Clear any existing data
    cacheManager.clear();
  });

  describe('Basic Operations', () => {
    it('should set and get values with default strategy', async () => {
      await cacheManager.set('test-key', { data: 'test-value' });
      const result = await cacheManager.get('test-key');
      
      expect(result).toEqual({ data: 'test-value' });
    });

    it('should return null for non-existent keys', async () => {
      const result = await cacheManager.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should invalidate specific keys', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      
      await cacheManager.invalidate('key1');
      
      expect(await cacheManager.get('key1')).toBeNull();
      expect(await cacheManager.get('key2')).toBe('value2');
    });

    it('should clear all cache', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      
      await cacheManager.clear();
      
      expect(await cacheManager.get('key1')).toBeNull();
      expect(await cacheManager.get('key2')).toBeNull();
    });
  });

  describe('Cache Strategies', () => {
    it('should register and use custom strategies', async () => {
      const strategy: CacheStrategy = {
        key: 'test-strategy',
        ttl: 60000,
        storage: 'memory',
        invalidationRules: []
      };
      
      cacheManager.registerStrategy('test-strategy', strategy);
      
      await cacheManager.set('test-key', 'test-value', 'test-strategy');
      const result = await cacheManager.get('test-key', 'test-strategy');
      
      expect(result).toBe('test-value');
    });

    it('should handle different storage types', async () => {
      const memoryStrategy: CacheStrategy = {
        key: 'memory-strategy',
        ttl: 60000,
        storage: 'memory',
        invalidationRules: []
      };
      
      const localStorageStrategy: CacheStrategy = {
        key: 'localStorage-strategy',
        ttl: 60000,
        storage: 'localstorage',
        invalidationRules: []
      };
      
      cacheManager.registerStrategy('memory', memoryStrategy);
      cacheManager.registerStrategy('localStorage', localStorageStrategy);
      
      // Test memory storage
      await cacheManager.set('memory-key', 'memory-value', 'memory');
      expect(await cacheManager.get('memory-key', 'memory')).toBe('memory-value');
      
      // Test localStorage storage
      await cacheManager.set('localStorage-key', 'localStorage-value', 'localStorage');
      expect(await cacheManager.get('localStorage-key', 'localStorage')).toBe('localStorage-value');
    });
  });

  describe('getOrFetch', () => {
    it('should fetch and cache new data', async () => {
      const fetchFn = vi.fn().mockResolvedValue('fetched-data');
      
      const result = await cacheManager.getOrFetch('new-key', fetchFn);
      
      expect(result).toBe('fetched-data');
      expect(fetchFn).toHaveBeenCalledOnce();
      
      // Should use cached value on second call
      const cachedResult = await cacheManager.getOrFetch('new-key', fetchFn);
      expect(cachedResult).toBe('fetched-data');
      expect(fetchFn).toHaveBeenCalledOnce(); // Should not be called again
    });

    it('should return cached data if available', async () => {
      await cacheManager.set('existing-key', 'cached-data');
      
      const fetchFn = vi.fn().mockResolvedValue('fresh-data');
      const result = await cacheManager.getOrFetch('existing-key', fetchFn);
      
      expect(result).toBe('cached-data');
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error('Fetch failed'));
      
      await expect(
        cacheManager.getOrFetch('error-key', fetchFn)
      ).rejects.toThrow('Fetch failed');
    });
  });

  describe('TTL and Expiration', () => {
    it('should respect TTL settings', async () => {
      const shortTTLStrategy: CacheStrategy = {
        key: 'short-ttl',
        ttl: 10, // 10ms
        storage: 'memory',
        invalidationRules: []
      };
      
      cacheManager.registerStrategy('short-ttl', shortTTLStrategy);
      
      await cacheManager.set('ttl-key', 'ttl-value', 'short-ttl');
      
      // Should be available immediately
      expect(await cacheManager.get('ttl-key', 'short-ttl')).toBe('ttl-value');
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Should be expired now
      expect(await cacheManager.get('ttl-key', 'short-ttl')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      // Test with an invalid strategy ID - should fallback to default behavior
      await cacheManager.set('test-key', 'test-value', 'non-existent-strategy');
      
      // Since the strategy doesn't exist, it should use default memory storage
      // So the value should actually be stored
      const result = await cacheManager.get('test-key');
      expect(result).toBe('test-value');
    });
  });
}); 