import React, { useState } from 'react';
import Map from 'react-map-gl';

// Temporarily paste your token here for testing
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoicmF6dHJvbmF1dCIsImEiOiJjbWJrd2p2dHAwaGo2Mmpva3Z5OHFyYTNpIn0.g6X2ANGsspSHHgsz4UM3gw';

export function SimpleMap() {
  const [viewState, setViewState] = useState({
    longitude: -79.3832,
    latitude: 43.6532,
    zoom: 11
  });

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  console.log('SimpleMap - Token available:', !!MAPBOX_TOKEN);
  console.log('SimpleMap - Token value:', MAPBOX_TOKEN?.substring(0, 20) + '...');

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {!mapLoaded && !mapError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div>Loading Simple Map...</div>
        </div>
      )}

      {mapError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          backgroundColor: '#fee',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #f00'
        }}>
          <div style={{ color: '#c00' }}>Error: {mapError}</div>
          <button onClick={() => setMapError(null)}>Retry</button>
        </div>
      )}

      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/raztronaut/cmbkwmlgl007m01qq43po7vdb"
        mapboxAccessToken={MAPBOX_TOKEN}
        onLoad={() => {
          console.log('Simple map loaded successfully!');
          setMapLoaded(true);
        }}
        onError={(error) => {
          console.error('Simple map error:', error);
          setMapError(`Map error: ${error.error?.message || JSON.stringify(error)}`);
        }}
      />
    </div>
  );
} 