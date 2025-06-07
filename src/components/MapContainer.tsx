import React, { useRef, useCallback, useState } from 'react';
import Map, { MapRef, Source, Layer, Popup, ViewStateChangeEvent } from 'react-map-gl';
import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { LayerConfig } from '../types';
import { DEFAULT_VIEW_STATE } from '../config/layers';
import { useDataLayer } from '../hooks/useDataLayer';

// Extend ImportMeta interface to include env
declare global {
  interface ImportMeta {
    env: {
      VITE_MAPBOX_TOKEN?: string;
      [key: string]: any;
    };
  }
}

// You'll need to set your Mapbox token here or as an environment variable  
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoicmF6dHJvbmF1dCIsImEiOiJjbWJrd2p2dHAwaGo2Mmpva3Z5OHFyYTNpIn0.g6X2ANGsspSHHgsz4UM3gw';

// Debug token loading
console.log('MapContainer - Token loaded:', MAPBOX_TOKEN ? 'YES' : 'NO');
console.log('MapContainer - Token starts with pk.:', MAPBOX_TOKEN?.startsWith('pk.') ? 'YES' : 'NO');

interface MapContainerProps {
  enabledLayers: LayerConfig[];
  onLayerClick?: (feature: any) => void;
}

interface PopupData {
  coordinates: [number, number];
  properties: any;
}

// GeoJSON type definition - using standard GeoJSON types for compatibility
type GeoJSONFeatureCollection = FeatureCollection<Geometry, GeoJsonProperties> | {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Point';
      coordinates: number[];
    };
    properties: any;
  }>;
};

export function MapContainer({ enabledLayers, onLayerClick }: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState(DEFAULT_VIEW_STATE);
  const [popupData, setPopupData] = useState<PopupData | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Data hooks for each layer
  const ttcData = useDataLayer('ttc-vehicles', 
    enabledLayers.some(l => l.id === 'ttc-vehicles'), 30000);
  const roadData = useDataLayer('road-restrictions', 
    enabledLayers.some(l => l.id === 'road-restrictions'), 300000);
  const bikeData = useDataLayer('bike-share', 
    enabledLayers.some(l => l.id === 'bike-share'), 60000);
  const beachData = useDataLayer('beach-water-quality', 
    enabledLayers.some(l => l.id === 'beach-water-quality'), 3600000);
  const beachObservationsData = useDataLayer('toronto-beaches-observations', 
    enabledLayers.some(l => l.id === 'toronto-beaches-observations'), 86400000);

  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Try to add 3D buildings layer if composite source is available
    try {
      // Check if the map style has the composite source
      const style = map.getStyle();
      if (style.sources && style.sources.composite) {
        map.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
          }
        });
        console.log('3D buildings layer added successfully');
      } else {
        console.log('Composite source not available in this map style - skipping 3D buildings');
      }
    } catch (error) {
      console.warn('Failed to add 3D buildings layer:', error);
    }
  }, []);

  const handleMapClick = useCallback((event: any) => {
    const features = event.features;
    
    if (features && features.length > 0) {
      const feature = features[0];
      
      // Get coordinates from the feature geometry instead of event.lngLat
      const coordinates = feature.geometry?.coordinates || [event.lngLat?.lng || 0, event.lngLat?.lat || 0];
      
      // Ensure coordinates are valid numbers
      const lng = typeof coordinates[0] === 'number' && !isNaN(coordinates[0]) ? coordinates[0] : 0;
      const lat = typeof coordinates[1] === 'number' && !isNaN(coordinates[1]) ? coordinates[1] : 0;
      
      console.log('Setting popup at coordinates:', [lng, lat]);
      
      setPopupData({
        coordinates: [lng, lat],
        properties: feature.properties
      });
      onLayerClick?.(feature);
    } else {
      setPopupData(null);
    }
  }, [onLayerClick]);

  const getLayerPaintConfig = (layerId: string, color: string) => {
    switch (layerId) {
      case 'ttc-vehicles':
        return {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 4,
            15, 8
          ] as any,
          'circle-color': color,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        };
      case 'road-restrictions':
        return {
          'circle-radius': 6,
          'circle-color': [
            'match',
            ['get', 'severity'],
            'high', '#dc2626',
            'medium', '#f59e0b',
            'low', '#65a30d',
            '#6b7280'
          ] as any,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        };
      case 'bike-share':
        return {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'bikes_available'],
            0, 3,
            5, 6,
            15, 10
          ] as any,
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'bikes_available'],
            0, '#dc2626',
            5, '#f59e0b',
            10, '#10b981'
          ] as any,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff'
        };
      case 'beach-water-quality':
        return {
          'circle-radius': 8,
          'circle-color': [
            'match',
            ['get', 'beach_advisory'],
            'safe', '#10b981',
            'caution', '#f59e0b',
            'unsafe', '#dc2626',
            '#6b7280'
          ] as any,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        };
      case 'toronto-beaches-observations':
        return {
          'circle-radius': 6,
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'waterTemp'],
            0, '#3b82f6',    // Cold - blue
            15, '#10b981',   // Moderate - green
            25, '#f59e0b',   // Warm - orange
            30, '#dc2626'    // Hot - red
          ] as any,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.8
        };
      default:
        return {
          'circle-radius': 5,
          'circle-color': color,
        };
    }
  };

  const renderLayers = () => {
    const layers: React.ReactElement[] = [];
    
    enabledLayers.forEach(layerConfig => {
      let geoJSON: GeoJSONFeatureCollection | null = null;
      
      switch (layerConfig.id) {
        case 'ttc-vehicles':
          geoJSON = ttcData.geoJSON;
          break;
        case 'road-restrictions':
          geoJSON = roadData.geoJSON;
          break;
        case 'bike-share':
          geoJSON = bikeData.geoJSON;
          break;
        case 'beach-water-quality':
          geoJSON = beachData.geoJSON;
          break;
        case 'toronto-beaches-observations':
          geoJSON = beachObservationsData.geoJSON;
          break;
      }

      if (geoJSON) {
        layers.push(
          <Source
            key={layerConfig.id}
            id={layerConfig.id}
            type="geojson"
            data={geoJSON}
          >
            <Layer
              id={`${layerConfig.id}-layer`}
              type="circle"
              paint={getLayerPaintConfig(layerConfig.id, layerConfig.color)}
            />
          </Source>
        );
      }
    });

    return layers;
  };

  const formatPopupContent = (properties: any) => {
    // Safety check for properties
    if (!properties) {
      return <div className="text-white">No data available</div>;
    }
    
    const { layerId } = properties;
    
    // Safety check for layerId
    if (!layerId) {
      return (
        <div className="text-white">
          <h3 className="font-semibold mb-2">Feature Details</h3>
          <pre className="text-xs text-gray-300 overflow-auto max-h-40">
            {JSON.stringify(properties, null, 2)}
          </pre>
        </div>
      );
    }
    
    switch (layerId) {
      case 'ttc-vehicles':
        return (
          <div className="min-w-[250px] p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${
                properties.vehicle_type === 'streetcar' ? 'bg-red-500' : 
                properties.vehicle_type === 'bus' ? 'bg-blue-500' : 'bg-green-500'
              }`}></div>
              <h3 className="font-semibold text-white text-lg">
                {properties.vehicle_type === 'streetcar' ? '🚋' : 
                 properties.vehicle_type === 'bus' ? '🚌' : '🚇'} 
                Route {properties.route || 'Unknown'}
                {properties.route_name && (
                  <span className="text-gray-300 font-normal"> - {properties.route_name}</span>
                )}
              </h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Vehicle ID:</span>
                <span className="text-white font-medium">{properties.vehicle_label || properties.id}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-300">Type:</span>
                <span className="text-white capitalize">{properties.vehicle_type}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-300">Direction:</span>
                <span className="text-white">{properties.direction}</span>
              </div>
              
              {properties.speed !== undefined && properties.speed !== null && properties.speed > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-300">Speed:</span>
                  <span className="text-white">{Math.round(Number(properties.speed) || 0)} km/h</span>
                </div>
              )}
              
              {properties.bearing !== undefined && properties.bearing !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-300">Heading:</span>
                  <span className="text-white">{Math.round(Number(properties.bearing) || 0)}°</span>
                </div>
              )}
              
              {properties.trip_id && (
                <div className="flex justify-between">
                  <span className="text-gray-300">Trip ID:</span>
                  <span className="text-white text-sm font-mono">{properties.trip_id}</span>
                </div>
              )}
              
              {properties.delay !== undefined && properties.delay > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Delay:</span>
                  <span className="text-red-400 font-medium">⚠️ {properties.delay} min</span>
                </div>
              )}
              
              {properties.next_stop && (
                <div className="flex justify-between">
                  <span className="text-gray-300">Next Stop:</span>
                  <span className="text-white">{properties.next_stop}</span>
                </div>
              )}
              
              {properties.occupancy_status && (
                <div className="flex justify-between">
                  <span className="text-gray-300">Occupancy:</span>
                  <span className="text-white capitalize">{properties.occupancy_status}</span>
                </div>
              )}
              
              <div className="pt-2 border-t border-gray-600">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Last Updated:</span>
                  <span className="text-gray-300">
                    {(() => {
                      try {
                        return properties.timestamp ? new Date(properties.timestamp).toLocaleTimeString() : 'Unknown';
                      } catch (error) {
                        return 'Invalid date';
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      case 'road-restrictions':
        return (
          <div>
            <h3 className="font-semibold text-white">Road Restriction</h3>
            <p className="text-gray-200"><strong>Location:</strong> {properties.location}</p>
            <p className="text-gray-200"><strong>Description:</strong> {properties.description}</p>
            <p className="text-gray-200"><strong>Severity:</strong> 
              <span className={`ml-1 font-medium ${
                properties.severity === 'high' ? 'text-gray-100' :
                properties.severity === 'medium' ? 'text-gray-200' : 'text-gray-300'
              }`}>
                {properties.severity}
              </span>
            </p>
          </div>
        );
      case 'bike-share':
        return (
          <div>
            <h3 className="font-semibold text-white">Bike Share Station</h3>
            <p className="text-gray-200"><strong>Name:</strong> {properties.name}</p>
            <p className="text-gray-200"><strong>Bikes Available:</strong> {properties.bikes_available}</p>
            <p className="text-gray-200"><strong>Docks Available:</strong> {properties.docks_available}</p>
            <p className="text-gray-200"><strong>Status:</strong> 
              <span className={`ml-1 font-medium ${
                properties.is_renting && properties.is_returning ? 'text-gray-100' : 'text-gray-300'
              }`}>
                {properties.is_renting && properties.is_returning ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
        );
      case 'beach-water-quality':
        return (
          <div>
            <h3 className="font-semibold text-white">Beach Water Quality</h3>
            <p className="text-gray-200"><strong>Beach:</strong> {properties.beach_name}</p>
            <p className="text-gray-200"><strong>E. Coli:</strong> {properties.e_coli} CFU/100ml</p>
            <p className="text-gray-200"><strong>Advisory:</strong> 
              <span className={`ml-1 font-medium ${
                properties.beach_advisory === 'safe' ? 'text-gray-100' :
                properties.beach_advisory === 'caution' ? 'text-gray-200' : 'text-gray-300'
              }`}>
                {properties.beach_advisory}
              </span>
            </p>
          </div>
        );
      case 'toronto-beaches-observations':
        return (
          <div className="min-w-[300px] max-w-[350px]">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0"></div>
              <h3 className="font-bold text-white text-xl leading-tight">
                🏖️ {properties.beachName || 'Beach Observation'}
              </h3>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <span className="text-gray-400 text-sm font-medium block">Date</span>
                  <span className={`font-semibold ${(() => {
                    const date = properties.dataCollectionDate || properties.observationDate || properties.sampleDate || properties.date;
                    if (date) {
                      try {
                        const observationDate = new Date(date);
                        const daysDiff = Math.floor((Date.now() - observationDate.getTime()) / (1000 * 60 * 60 * 24));
                        return daysDiff > 7 ? 'text-yellow-300' : 'text-white';
                      } catch {
                        return 'text-gray-300';
                      }
                    }
                    return 'text-gray-300';
                  })()}`}>
                    {(() => {
                      const date = properties.dataCollectionDate || properties.observationDate || properties.sampleDate || properties.date;
                      if (date) {
                        try {
                          const observationDate = new Date(date);
                          const daysDiff = Math.floor((Date.now() - observationDate.getTime()) / (1000 * 60 * 60 * 24));
                          const formattedDate = observationDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          });
                          return daysDiff > 0 ? `${formattedDate} (${daysDiff}d ago)` : formattedDate;
                        } catch {
                          return date;
                        }
                      }
                      return 'Unknown';
                    })()}
                  </span>
                </div>
                
                {properties.waterTemp !== undefined && properties.waterTemp !== null && (
                  <div>
                    <span className="text-gray-400 text-sm font-medium block">Water Temp</span>
                    <span className="text-blue-300 font-bold text-lg">{properties.waterTemp}°C</span>
                  </div>
                )}
                
                {properties.airTemp !== undefined && properties.airTemp !== null && (
                  <div>
                    <span className="text-gray-400 text-sm font-medium block">Air Temp</span>
                    <span className="text-orange-300 font-bold text-lg">{properties.airTemp}°C</span>
                  </div>
                )}
                
                {(properties.waterClarity || properties.turbidity) && (
                  <div>
                    <span className="text-gray-400 text-sm font-medium block">Water Clarity</span>
                    <span className={`font-semibold capitalize ${
                      (properties.waterClarity && properties.waterClarity.toLowerCase().includes('clear')) || 
                      (properties.turbidity && properties.turbidity.toLowerCase().includes('clear')) ? 'text-green-300' :
                      (properties.waterClarity && properties.waterClarity.toLowerCase().includes('cloudy')) ||
                      (properties.turbidity && properties.turbidity.toLowerCase().includes('cloudy')) ? 'text-yellow-300' :
                      'text-red-300'
                    }`}>
                      {properties.waterClarity || properties.turbidity}
                    </span>
                  </div>
                )}
                
                {properties.waveAction && (
                  <div>
                    <span className="text-gray-400 text-sm font-medium block">Wave Action</span>
                    <span className={`font-semibold capitalize ${
                      properties.waveAction.toLowerCase() === 'low' || properties.waveAction.toLowerCase() === 'none' ? 'text-green-300' :
                      properties.waveAction.toLowerCase() === 'medium' ? 'text-yellow-300' :
                      'text-red-300'
                    }`}>
                      {properties.waveAction}
                    </span>
                  </div>
                )}
                
                {properties.windDirection && (
                  <div>
                    <span className="text-gray-400 text-sm font-medium block">Wind Direction</span>
                    <span className="text-white font-semibold">{properties.windDirection}</span>
                  </div>
                )}
                
                {properties.windSpeed !== undefined && properties.windSpeed !== null && (
                  <div>
                    <span className="text-gray-400 text-sm font-medium block">Wind Speed</span>
                    <span className="text-cyan-300 font-semibold">{properties.windSpeed} km/h</span>
                  </div>
                )}
                
                {properties.waterFowl !== undefined && properties.waterFowl !== null && (
                  <div>
                    <span className="text-gray-400 text-sm font-medium block">Water Fowl</span>
                    <span className="text-white font-semibold">{properties.waterFowl} birds</span>
                  </div>
                )}
                
                {(properties.rain || properties.rainfall) && (
                  <div>
                    <span className="text-gray-400 text-sm font-medium block">Rain</span>
                    <span className={`font-semibold capitalize ${
                      (properties.rain && properties.rain.toLowerCase() === 'no') || 
                      (properties.rainfall && properties.rainfall.toLowerCase() === 'no') ? 'text-green-300' : 'text-blue-300'
                    }`}>
                      {properties.rain || properties.rainfall}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="pt-3 border-t border-gray-600">
                <div className="text-xs text-gray-400 text-center">
                  Toronto Beach Observation Data
                  {(() => {
                    const date = properties.dataCollectionDate || properties.observationDate || properties.sampleDate || properties.date;
                    if (date) {
                      try {
                        const observationDate = new Date(date);
                        const daysDiff = Math.floor((Date.now() - observationDate.getTime()) / (1000 * 60 * 60 * 24));
                        if (daysDiff > 7) {
                          return <div className="text-yellow-400 text-xs mt-1">⚠️ Data is {daysDiff} days old</div>;
                        }
                      } catch {
                        // Ignore date parsing errors
                      }
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return <div className="text-white">Feature details</div>;
    }
  };

  return (
    <div className="relative w-full h-full">
      {mapError && (
        <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center z-20">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md border border-gray-600">
            <h3 className="text-lg font-bold text-white mb-2">Map Error</h3>
            <p className="text-gray-300">{mapError}</p>
            <button 
              onClick={() => setMapError(null)} 
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/raztronaut/cmbkwmlgl007m01qq43po7vdb"
        onLoad={() => {
          console.log('Map loaded successfully!');
          setMapLoaded(true);
          onMapLoad();
        }}
        onError={(error) => {
          console.error('Map error:', error);
          setMapError(`Map failed to load: ${error.error?.message || 'Unknown error'}`);
        }}
        onClick={handleMapClick}
        interactiveLayerIds={enabledLayers.map(l => `${l.id}-layer`)}
        // Remove terrain for now as it might cause issues
        // terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
      >
        {renderLayers()}
        
        {popupData && (
          <Popup
            longitude={popupData.coordinates[0]}
            latitude={popupData.coordinates[1]}
            anchor="bottom"
            onClose={() => setPopupData(null)}
            className="ttc-popup"
            closeButton={true}
            closeOnClick={false}
            style={{
              background: 'rgba(17, 24, 39, 0.95)',
              color: 'white',
              borderRadius: '8px',
              border: 'none'
            }}
          >
            {formatPopupContent(popupData.properties)}
          </Popup>
        )}
      </Map>
      
      {/* Map Loading indicator */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-600">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-300"></div>
              <span className="text-lg text-white">Loading Toronto Pulse Map...</span>
            </div>
          </div>
        </div>
      )}

      {/* Data Loading indicator */}
      {mapLoaded && (ttcData.loading || roadData.loading || bikeData.loading || beachData.loading) && (
        <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 shadow-xl border border-gray-700/50">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300"></div>
            <span className="text-sm text-white">Loading data...</span>
          </div>
        </div>
      )}
    </div>
  );
} 