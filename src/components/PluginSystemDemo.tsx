import React, { useState, useEffect } from 'react';
import { usePluginService, usePluginRegistry, usePluginLoader } from '../app/hooks/useDataLayerV2';

export function PluginSystemDemo() {
  const pluginService = usePluginService();
  const pluginRegistry = usePluginRegistry();
  const pluginLoader = usePluginLoader();
  
  const [plugins, setPlugins] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<Map<string, any>>(new Map());
  const [healthStatus, setHealthStatus] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlugins = async () => {
      try {
        await pluginLoader.loadAllPlugins();
        const loadedPlugins = pluginService.getAllPlugins();
        setPlugins(loadedPlugins);
        
        // Get metrics and health status for all plugins
        const allMetrics = pluginService.getAllMetrics();
        const allHealth = pluginService.getAllHealthStatus();
        
        setMetrics(allMetrics);
        setHealthStatus(allHealth);
      } catch (error) {
        console.error('Failed to load plugins:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlugins();
  }, [pluginService, pluginLoader]);

  const handleTestPlugin = async (pluginId: string) => {
    try {
      console.log(`Testing plugin: ${pluginId}`);
      const data = await pluginService.fetchData(pluginId);
      console.log(`Plugin ${pluginId} returned:`, data);
      
      // Refresh metrics and health status
      const allMetrics = pluginService.getAllMetrics();
      const allHealth = pluginService.getAllHealthStatus();
      setMetrics(allMetrics);
      setHealthStatus(allHealth);
    } catch (error) {
      console.error(`Failed to test plugin ${pluginId}:`, error);
    }
  };

  const handleInvalidateCache = async (pluginId: string) => {
    try {
      await pluginService.invalidateCache(pluginId);
      console.log(`Cache invalidated for plugin: ${pluginId}`);
    } catch (error) {
      console.error(`Failed to invalidate cache for ${pluginId}:`, error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 text-white rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Loading plugin system...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">🔌 Plugin System Demo</h2>
        <p className="text-gray-300 mb-6">
          This demonstrates the new plugin architecture for Toronto Pulse. 
          Plugins are dynamically loaded and provide real-time data with monitoring capabilities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plugin List */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">📦 Loaded Plugins</h3>
          {plugins.length === 0 ? (
            <p className="text-gray-400">No plugins loaded</p>
          ) : (
            plugins.map((plugin) => {
              const pluginMetrics = metrics.get(plugin.metadata.id);
              const pluginHealth = healthStatus[plugin.metadata.id];
              
              return (
                <div key={plugin.metadata.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-lg">{plugin.metadata.name}</h4>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        plugin.metadata.reliability === 'high' ? 'bg-green-600' :
                        plugin.metadata.reliability === 'medium' ? 'bg-yellow-600' : 'bg-red-600'
                      }`}>
                        {plugin.metadata.reliability}
                      </span>
                      {pluginHealth && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          pluginHealth.status === 'healthy' ? 'bg-green-600' :
                          pluginHealth.status === 'degraded' ? 'bg-yellow-600' : 'bg-red-600'
                        }`}>
                          {pluginHealth.status}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-300 space-y-1">
                    <p><strong>ID:</strong> {plugin.metadata.id}</p>
                    <p><strong>Domain:</strong> {plugin.metadata.domain}</p>
                    <p><strong>Version:</strong> {plugin.metadata.version}</p>
                    <p><strong>Description:</strong> {plugin.metadata.description}</p>
                    <p><strong>Tags:</strong> {plugin.metadata.tags.join(', ')}</p>
                    <p><strong>Refresh Interval:</strong> {plugin.metadata.refreshInterval / 1000}s</p>
                  </div>

                  {pluginMetrics && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <h5 className="font-medium mb-2">📊 Metrics</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-400">Fetch Count:</span>
                          <span className="ml-2 font-medium">{pluginMetrics.fetchCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Error Count:</span>
                          <span className="ml-2 font-medium">{pluginMetrics.errorCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Avg Response:</span>
                          <span className="ml-2 font-medium">{Math.round(pluginMetrics.avgResponseTime)}ms</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Quality Score:</span>
                          <span className="ml-2 font-medium">{pluginMetrics.dataQualityScore.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-gray-400">Last Success:</span>
                        <span className="ml-2 font-medium text-xs">
                          {pluginMetrics.lastSuccessfulFetch.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {pluginHealth && pluginHealth.issues.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <h5 className="font-medium mb-2 text-yellow-400">⚠️ Issues</h5>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {pluginHealth.issues.map((issue: string, index: number) => (
                          <li key={index} className="flex items-center space-x-2">
                            <span className="w-1 h-1 bg-yellow-400 rounded-full"></span>
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => handleTestPlugin(plugin.metadata.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
                    >
                      Test Plugin
                    </button>
                    <button
                      onClick={() => handleInvalidateCache(plugin.metadata.id)}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
                    >
                      Clear Cache
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* System Overview */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">🔍 System Overview</h3>
          
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h4 className="font-semibold mb-3">Registry Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Plugins:</span>
                <span className="font-medium">{plugins.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Domains:</span>
                <span className="font-medium">
                  {Array.from(new Set(plugins.map(p => p.metadata.domain))).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">High Reliability:</span>
                <span className="font-medium">
                  {plugins.filter(p => p.metadata.reliability === 'high').length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h4 className="font-semibold mb-3">Health Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Healthy:</span>
                <span className="font-medium text-green-400">
                  {Object.values(healthStatus).filter((h: any) => h.status === 'healthy').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Degraded:</span>
                <span className="font-medium text-yellow-400">
                  {Object.values(healthStatus).filter((h: any) => h.status === 'degraded').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Unhealthy:</span>
                <span className="font-medium text-red-400">
                  {Object.values(healthStatus).filter((h: any) => h.status === 'unhealthy').length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h4 className="font-semibold mb-3">Performance Metrics</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Fetches:</span>
                <span className="font-medium">
                  {Array.from(metrics.values()).reduce((sum, m) => sum + m.fetchCount, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Errors:</span>
                <span className="font-medium">
                  {Array.from(metrics.values()).reduce((sum, m) => sum + m.errorCount, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Response Time:</span>
                <span className="font-medium">
                  {Math.round(
                    Array.from(metrics.values()).reduce((sum, m) => sum + m.avgResponseTime, 0) / 
                    Math.max(metrics.size, 1)
                  )}ms
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 