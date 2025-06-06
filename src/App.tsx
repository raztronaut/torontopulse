import { useState, useCallback } from 'react';
import { MapContainer } from './components/MapContainer';
import { DashboardPanel } from './components/DashboardPanel';
import { LAYER_CONFIGS, DASHBOARD_MODES } from './config/layers';
import { LayerConfig, DashboardMode } from './types';
import { DataService } from './services/dataService';

function App() {
  const [layers, setLayers] = useState<LayerConfig[]>(LAYER_CONFIGS);
  const [currentMode, setCurrentMode] = useState('transit');
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  const dataService = DataService.getInstance();

  const handleModeChange = useCallback((mode: DashboardMode) => {
    setCurrentMode(mode.id);
    
    // Update layers based on selected mode
    setLayers(prevLayers =>
      prevLayers.map(layer => ({
        ...layer,
        enabled: mode.layers.includes(layer.id),
      }))
    );
  }, []);

  const handleLayerToggle = useCallback((layerId: string) => {
    setLayers(prevLayers =>
      prevLayers.map(layer =>
        layer.id === layerId
          ? { ...layer, enabled: !layer.enabled }
          : layer
      )
    );
    
    // Set mode to custom if manually toggling layers
    const currentModeData = DASHBOARD_MODES.find(m => m.id === currentMode);
    if (currentModeData) {
      const enabledLayerIds = layers
        .map(l => l.id === layerId ? { ...l, enabled: !l.enabled } : l)
        .filter(l => l.enabled)
        .map(l => l.id);
      
      const isExactMatch = currentModeData.layers.length === enabledLayerIds.length &&
        currentModeData.layers.every(id => enabledLayerIds.includes(id));
      
      if (!isExactMatch) {
        setCurrentMode('custom');
      }
    }
  }, [layers, currentMode]);

  const handleRefresh = useCallback(() => {
    dataService.clearCache();
    // Force refresh by briefly disabling and re-enabling layers
    const enabledLayers = layers.filter(l => l.enabled);
    setLayers(prevLayers =>
      prevLayers.map(layer => ({ ...layer, enabled: false }))
    );
    
    setTimeout(() => {
      setLayers(prevLayers =>
        prevLayers.map(layer => ({
          ...layer,
          enabled: enabledLayers.some(el => el.id === layer.id),
        }))
      );
    }, 100);
  }, [dataService, layers]);

  const handleLayerClick = useCallback((feature: any) => {
    console.log('Layer feature clicked:', feature);
    // You can add custom logic here for when features are clicked
  }, []);

  const enabledLayers = layers.filter(layer => layer.enabled);

  return (
    <div className="w-full h-screen bg-gray-900">
      <MapContainer
        enabledLayers={enabledLayers}
        onLayerClick={handleLayerClick}
      />
      
      <DashboardPanel
        layers={layers}
        currentMode={currentMode}
        isExpanded={isPanelExpanded}
        onModeChange={handleModeChange}
        onLayerToggle={handleLayerToggle}
        onRefresh={handleRefresh}
        onToggleExpanded={() => setIsPanelExpanded(!isPanelExpanded)}
      />

      {/* Attribution */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-300 shadow-xl border border-gray-700/50">
          <div className="flex items-center space-x-2">
            <span>Data from</span>
            <a
              href="https://open.toronto.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-100 hover:underline"
            >
              Toronto Open Data
            </a>
            <span>•</span>
            <a
              href="https://mapbox.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-100 hover:underline"
            >
              Mapbox
            </a>
          </div>
        </div>
      </div>

      {/* Instructions overlay for first-time users */}
      {isPanelExpanded && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 shadow-xl max-w-sm border border-gray-700/50">
            <h3 className="font-semibold text-white mb-2">Welcome to Toronto Pulse!</h3>
            <div className="text-sm text-gray-300 space-y-1">
              <p>• Select a mode or toggle individual layers</p>
              <p>• Click on map markers for details</p>
              <p>• Scroll to zoom, drag to pan</p>
              <p>• Hold Ctrl + drag to rotate (3D view)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 