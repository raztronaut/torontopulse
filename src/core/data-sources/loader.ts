import { DataSourcePlugin } from './types';
import { DataSourceRegistry } from './registry';


const knownPlugins: DataSourcePlugin[] = [];

export class PluginLoader {
  private registry: DataSourceRegistry;

  constructor(registry: DataSourceRegistry) {
    this.registry = registry;
  }

  /**
   * Load a specific plugin by path
   */
  async loadPlugin(pluginPath: string): Promise<DataSourcePlugin> {
    try {
      let module;
      
      // Static imports for known plugins to avoid dynamic import issues in tests
      if (pluginPath === 'transportation/ttc-vehicles') {
        module = await import('../../domains/transportation/ttc-vehicles/index.js');
      } else if (pluginPath === 'transportation/bike-share-toronto') {
        module = await import('../../domains/transportation/bike-share-toronto/index.js');
      } else if (pluginPath === 'infrastructure/road-restrictions') {
        module = await import('../../domains/infrastructure/road-restrictions/index.js');
      } else if (pluginPath === 'environment/toronto-beaches-observations') {
        module = await import('../../domains/environment/toronto-beaches-observations/index.js');
      } else if (pluginPath === 'infrastructure/automated-speed-enforcement-locations') {
        module = await import('../../domains/infrastructure/automated-speed-enforcement-locations/index.js');
      } else {
        // Fallback to dynamic import for unknown plugins
        module = await import(`../../domains/${pluginPath}/index.js`);
      }
      
      const PluginClass = module.default || module[Object.keys(module)[0]];
      
      if (!PluginClass) {
        throw new Error(`No plugin class found in ${pluginPath}`);
      }

      // Instantiate the plugin
      const plugin = new PluginClass();
      
      // Validate plugin structure
      this.validatePlugin(plugin);
      
      // Call lifecycle hook
      if (plugin.onLoad) {
        await plugin.onLoad();
      }

      return plugin;
    } catch (error) {
      console.error(`Failed to load plugin at ${pluginPath}:`, error);
      throw error;
    }
  }

  /**
   * Load all plugins from the domains directory
   */
  async loadAllPlugins(): Promise<DataSourcePlugin[]> {
    const plugins: DataSourcePlugin[] = [];
    
    // For now, manually specify known plugins
    // In the future, this could be automated with dynamic discovery
    const knownPlugins = [
      'transportation/ttc-vehicles',
      'transportation/bike-share-toronto',
      'infrastructure/road-restrictions',
      'environment/toronto-beaches-observations',
      'infrastructure/automated-speed-enforcement-locations'
    ];

    for (const pluginPath of knownPlugins) {
      try {
        const plugin = await this.loadPlugin(pluginPath);
        plugins.push(plugin);
        this.registry.register(plugin);
        console.log(`✅ Loaded plugin: ${plugin.metadata.name}`);
      } catch (error) {
        console.error(`❌ Failed to load plugin ${pluginPath}:`, error);
      }
    }

    return plugins;
  }

  /**
   * Load plugins by domain
   */
  async loadPluginsByDomain(domain: string): Promise<DataSourcePlugin[]> {
    const allPlugins = await this.loadAllPlugins();
    return allPlugins.filter(plugin => plugin.metadata.domain === domain);
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.registry.get(pluginId);
    if (plugin) {
      // Call lifecycle hook
      if (plugin.onUnload) {
        await plugin.onUnload();
      }
      
      this.registry.unregister(pluginId);
      console.log(`🗑️  Unloaded plugin: ${plugin.metadata.name}`);
    }
  }

  /**
   * Reload a plugin
   */
  async reloadPlugin(pluginId: string): Promise<DataSourcePlugin | null> {
    const plugin = this.registry.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin ${pluginId} not found for reload`);
      return null;
    }

    const pluginPath = `${plugin.metadata.domain}/${pluginId}`;
    
    // Unload existing plugin
    await this.unloadPlugin(pluginId);
    
    // Load the plugin again
    try {
      const reloadedPlugin = await this.loadPlugin(pluginPath);
      this.registry.register(reloadedPlugin);
      console.log(`🔄 Reloaded plugin: ${reloadedPlugin.metadata.name}`);
      return reloadedPlugin;
    } catch (error) {
      console.error(`Failed to reload plugin ${pluginId}:`, error);
      return null;
    }
  }

  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: any): void {
    if (!plugin.metadata) {
      throw new Error('Plugin must have metadata');
    }

    if (!plugin.metadata.id) {
      throw new Error('Plugin metadata must have an id');
    }

    if (!plugin.metadata.name) {
      throw new Error('Plugin metadata must have a name');
    }

    if (!plugin.metadata.domain) {
      throw new Error('Plugin metadata must have a domain');
    }

    if (!plugin.fetcher) {
      throw new Error('Plugin must have a fetcher');
    }

    if (!plugin.transformer) {
      throw new Error('Plugin must have a transformer');
    }

    if (!plugin.validator) {
      throw new Error('Plugin must have a validator');
    }

    if (typeof plugin.fetcher.fetch !== 'function') {
      throw new Error('Plugin fetcher must have a fetch method');
    }

    if (typeof plugin.transformer.transform !== 'function') {
      throw new Error('Plugin transformer must have a transform method');
    }

    if (typeof plugin.validator.validate !== 'function') {
      throw new Error('Plugin validator must have a validate method');
    }
  }
} 