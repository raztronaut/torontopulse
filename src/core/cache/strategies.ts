export interface CacheStrategy {
  key: string;
  ttl: number;
  storage: 'memory' | 'indexeddb' | 'localstorage';
  invalidationRules: string[];
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export interface CacheStorage<T = any> {
  get(key: string): Promise<CacheEntry<T> | null>;
  set(key: string, entry: CacheEntry<T>): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

class MemoryStorage<T = any> implements CacheStorage<T> {
  private store = new Map<string, CacheEntry<T>>();

  async get(key: string): Promise<CacheEntry<T> | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, entry: CacheEntry<T>): Promise<void> {
    this.store.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}

class LocalStorageStorage<T = any> implements CacheStorage<T> {
  private prefix = 'toronto-pulse-cache:';

  async get(key: string): Promise<CacheEntry<T> | null> {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
    keys.forEach(key => localStorage.removeItem(key));
  }

  async keys(): Promise<string[]> {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .map(key => key.substring(this.prefix.length));
  }
}

class IndexedDBStorage<T = any> implements CacheStorage<T> {
  private dbName = 'toronto-pulse-cache';
  private storeName = 'cache-entries';
  private version = 1;

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }

  async get(key: string): Promise<CacheEntry<T> | null> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve) => {
        const request = store.get(key);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result : null);
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async set(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({ ...entry, key });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Failed to save to IndexedDB:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    } catch (error) {
      console.warn('Failed to clear IndexedDB:', error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve) => {
        const request = store.getAllKeys();
        request.onsuccess = () => resolve(request.result as string[]);
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }
}

export class CacheManager {
  private storages = new Map<string, CacheStorage>();
  private strategies = new Map<string, CacheStrategy>();

  constructor() {
    this.storages.set('memory', new MemoryStorage());
    this.storages.set('localstorage', new LocalStorageStorage());
    this.storages.set('indexeddb', new IndexedDBStorage());
  }

  registerStrategy(id: string, strategy: CacheStrategy): void {
    this.strategies.set(id, strategy);
  }

  async get<T>(key: string, strategyId?: string): Promise<T | null> {
    const strategy = strategyId ? this.strategies.get(strategyId) : null;
    if (!strategy) {
      // Try all storage types
      for (const storage of this.storages.values()) {
        const entry = await storage.get(key);
        if (entry && this.isValidEntry(entry)) {
          return entry.data;
        }
      }
      return null;
    }

    const storage = this.storages.get(strategy.storage);
    if (!storage) return null;

    const entry = await storage.get(key);
    if (!entry || !this.isValidEntry(entry)) {
      return null;
    }

    return entry.data;
  }

  async set<T>(key: string, value: T, strategyId?: string): Promise<void> {
    const strategy = strategyId ? this.strategies.get(strategyId) : null;
    if (!strategy) {
      // Default to memory storage
      const storage = this.storages.get('memory')!;
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl: 300000, // 5 minutes default
        key
      };
      await storage.set(key, entry);
      return;
    }

    const storage = this.storages.get(strategy.storage);
    if (!storage) return;

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: strategy.ttl,
      key
    };

    await storage.set(key, entry);
  }

  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    _ttl?: number,
    _storageType: 'memory' | 'indexeddb' | 'localstorage' = 'memory'
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch new data
    const data = await fetchFn();
    
    // Cache the result
    await this.set(key, data, undefined);
    
    return data;
  }

  async invalidate(key: string): Promise<void> {
    const promises = Array.from(this.storages.values()).map(storage => 
      storage.delete(key)
    );
    await Promise.all(promises);
  }

  async clear(): Promise<void> {
    const promises = Array.from(this.storages.values()).map(storage => 
      storage.clear()
    );
    await Promise.all(promises);
  }

  private isValidEntry<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;
    return age < entry.ttl;
  }

  // Cleanup expired entries
  async cleanup(): Promise<void> {
    for (const [storageType, storage] of this.storages) {
      try {
        const keys = await storage.keys();
        for (const key of keys) {
          const entry = await storage.get(key);
          if (entry && !this.isValidEntry(entry)) {
            await storage.delete(key);
          }
        }
      } catch (error) {
        console.warn(`Failed to cleanup ${storageType} storage:`, error);
      }
    }
  }
} 