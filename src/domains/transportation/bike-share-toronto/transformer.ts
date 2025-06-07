import { DataTransformer } from '../../../core/data-sources/types';
import { BikeStation } from '../../../types';
import type { FeatureCollection, Feature, Point } from 'geojson';

/**
 * Transformer for Bike Share Toronto
 * Converts JSON data to GeoJSON format
 */
export class BikeShareTorontoTransformer implements DataTransformer {
  transform(data: BikeStation[]): FeatureCollection {
    const features: Feature[] = data
      .filter(station => 
        station.latitude && 
        station.longitude && 
        station.latitude !== 0 && 
        station.longitude !== 0 &&
        station.is_installed
      )
      .map(station => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [station.longitude, station.latitude]
        } as Point,
        properties: {
          layerId: 'bike-share',
          id: station.id,
          name: station.name,
          capacity: station.capacity,
          bikes_available: station.bikes_available,
          docks_available: station.docks_available,
          is_installed: station.is_installed,
          is_renting: station.is_renting,
          is_returning: station.is_returning,
          last_reported: station.last_reported,
          // Additional properties for visualization
          title: `🚲 ${station.name}`,
          description: `${station.bikes_available} bikes, ${station.docks_available} docks available`,
          // Status indicators
          status: station.is_renting && station.is_returning ? 'active' : 'inactive',
          availability_ratio: station.capacity > 0 ? station.bikes_available / station.capacity : 0,
          // Color coding based on bike availability
          availability_category: station.bikes_available === 0 ? 'empty' : 
                                station.bikes_available <= 2 ? 'low' :
                                station.bikes_available <= 5 ? 'medium' : 'high'
        }
      }));

    return {
      type: 'FeatureCollection',
      features
    };
  }
}