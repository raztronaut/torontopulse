import { DataSourcePlugin, DataSourceConfig } from './types';

export class DataSourceRegistry {
  private sources = new Map<string, DataSourcePlugin>();
  private configs = new Map<string, DataSourceConfig>();

  register(plugin: DataSourcePlugin, config?: DataSourceConfig): void {
    this.sources.set(plugin.metadata.id, plugin);
    if (config) {
      this.configs.set(plugin.metadata.id, config);
    }
  }

  unregister(id: string): boolean {
    const removed = this.sources.delete(id);
    this.configs.delete(id);
    return removed;
  }

  get(id: string): DataSourcePlugin | undefined {
    return this.sources.get(id);
  }

  getConfig(id: string): DataSourceConfig | undefined {
    return this.configs.get(id);
  }

  getByDomain(domain: string): DataSourcePlugin[] {
    return Array.from(this.sources.values())
      .filter(source => source.metadata.domain === domain);
  }

  getByTags(tags: string[]): DataSourcePlugin[] {
    return Array.from(this.sources.values())
      .filter(source => 
        tags.some(tag => source.metadata.tags.includes(tag))
      );
  }

  getByReliability(reliability: 'high' | 'medium' | 'low'): DataSourcePlugin[] {
    return Array.from(this.sources.values())
      .filter(source => source.metadata.reliability === reliability);
  }

  getAll(): DataSourcePlugin[] {
    return Array.from(this.sources.values());
  }

  getAllIds(): string[] {
    return Array.from(this.sources.keys());
  }

  has(id: string): boolean {
    return this.sources.has(id);
  }

  count(): number {
    return this.sources.size;
  }

  getHealthySources(): DataSourcePlugin[] {
    // This will be expanded when we implement health checking
    return this.getAll();
  }

  getDomains(): string[] {
    const domains = new Set<string>();
    for (const source of this.sources.values()) {
      domains.add(source.metadata.domain);
    }
    return Array.from(domains);
  }

  clear(): void {
    this.sources.clear();
    this.configs.clear();
  }

  // For debugging and development
  getRegistryStatus(): {
    totalSources: number;
    domains: string[];
    sourcesByDomain: Record<string, number>;
    sourceIds: string[];
  } {
    const domains = this.getDomains();
    const sourcesByDomain: Record<string, number> = {};
    
    for (const domain of domains) {
      sourcesByDomain[domain] = this.getByDomain(domain).length;
    }

    return {
      totalSources: this.count(),
      domains,
      sourcesByDomain,
      sourceIds: this.getAllIds()
    };
  }
} 