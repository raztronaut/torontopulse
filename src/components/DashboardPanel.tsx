import React from 'react';
import { 
  Bus, 
  Construction, 
  Bike, 
  Waves, 
  Train, 
  Building, 
  Leaf, 
  Globe, 
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { LayerConfig, DashboardMode } from '../types';
import { DASHBOARD_MODES } from '../config/layers';

const IconMap = {
  Bus,
  Construction,
  Bike,
  Waves,
  Train,
  Building,
  Leaf,
  Globe,
};

interface DashboardPanelProps {
  layers: LayerConfig[];
  currentMode: string;
  isExpanded: boolean;
  onModeChange: (mode: DashboardMode) => void;
  onLayerToggle: (layerId: string) => void;
  onRefresh: () => void;
  onToggleExpanded: () => void;
}

export function DashboardPanel({
  layers,
  currentMode,
  isExpanded,
  onModeChange,
  onLayerToggle,
  onRefresh,
  onToggleExpanded,
}: DashboardPanelProps) {
  const currentModeData = DASHBOARD_MODES.find(m => m.id === currentMode);

  const getIcon = (iconName: string) => {
    const Icon = IconMap[iconName as keyof typeof IconMap];
    return Icon ? <Icon size={20} /> : <Globe size={20} />;
  };

  return (
    <div className="absolute top-4 left-4 z-10">
      <div className="dashboard-card w-80 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-white">Toronto Pulse</h2>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              className="p-1 rounded-md hover:bg-gray-800/50 transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={16} className="text-gray-300" />
            </button>
            <button
              onClick={onToggleExpanded}
              className="p-1 rounded-md hover:bg-gray-800/50 transition-colors"
            >
              {isExpanded ? <ChevronUp size={16} className="text-gray-300" /> : <ChevronDown size={16} className="text-gray-300" />}
            </button>
          </div>
        </div>

        {/* Current Mode Display */}
        <div className="mb-4 p-3 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg border border-gray-600/50">
          <div className="flex items-center space-x-3">
            <div className="text-gray-300">
              {currentModeData && getIcon(currentModeData.icon)}
            </div>
            <div>
              <h3 className="font-semibold text-white">
                {currentModeData?.name || 'Custom Mode'}
              </h3>
              <p className="text-sm text-gray-300">
                {currentModeData?.description || 'Custom layer selection'}
              </p>
            </div>
          </div>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="space-y-4">
            {/* Mode Selection */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Quick Modes</h4>
              <div className="grid grid-cols-2 gap-2">
                {DASHBOARD_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => onModeChange(mode)}
                    className={`p-2 rounded-md text-left transition-colors ${
                      currentMode === mode.id
                        ? 'bg-gray-700/70 border border-gray-500 text-white'
                        : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`${currentMode === mode.id ? 'text-gray-300' : 'text-gray-400'}`}>
                        {getIcon(mode.icon)}
                      </div>
                      <span className="text-sm font-medium">{mode.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Layer Controls */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Data Layers</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {layers.map((layer) => (
                  <div
                    key={layer.id}
                    className={`layer-toggle ${layer.enabled ? 'active' : ''}`}
                    onClick={() => onLayerToggle(layer.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-gray-400">
                        {getIcon(layer.icon)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">
                          {layer.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {layer.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: layer.color }}
                      ></div>
                      <div
                        className={`w-10 h-6 rounded-full transition-colors ${
                          layer.enabled ? 'bg-gray-500' : 'bg-gray-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-gray-200 rounded-full shadow transform transition-transform ${
                            layer.enabled ? 'translate-x-5 mt-1' : 'translate-x-1 mt-1'
                          }`}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Stats */}
            <div className="pt-3 border-t border-gray-600">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-white">
                    {layers.filter(l => l.enabled).length}
                  </div>
                  <div className="text-xs text-gray-400">Active Layers</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">
                    {Math.floor(Math.random() * 1000) + 500}
                  </div>
                  <div className="text-xs text-gray-400">Data Points</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 