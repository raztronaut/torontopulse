import { DataTransformer } from '../../../core/data-sources/types.js';
import { GeoJSONFeatureCollection, GeoJSONFeature } from '../../../types/geojson.js';

/**
 * Transformer for Red Light Cameras
 * Converts JSON data to GeoJSON format
 */
export class RedLightCamerasTransformer implements DataTransformer {
  transform(data: any): GeoJSONFeatureCollection {
    try {
      // Extract nested array if required
      let items: any = data;
      if (typeof data === 'object' && !Array.isArray(data)) {
        items = data.result?.records || data.result || data;
      }

      if (!Array.isArray(items)) {
        throw new Error('Expected array of items inside property "result.records"');
      }

      const features = items.map(item => this.createFeature(item));

      return {
        type: 'FeatureCollection',
        features
      };
    } catch (error) {
      console.error(`Error transforming Red Light Cameras data:`, error);
      throw error;
    }
  }

  private createFeature(item: any): GeoJSONFeature {
    // Extract coordinates from geometry field if it exists
    let coordinates: [number, number] = [0, 0];
    
    if (item.geometry) {
      try {
        const geometry = typeof item.geometry === 'string' ? JSON.parse(item.geometry) : item.geometry;
        if (geometry.type === 'Point' && geometry.coordinates) {
          coordinates = [geometry.coordinates[0], geometry.coordinates[1]];
        }
      } catch (error) {
        console.warn('Failed to parse geometry:', error);
      }
    }
    
    // Fallback to direct coordinate fields if geometry parsing failed
    if (coordinates[0] === 0 && coordinates[1] === 0) {
      coordinates = [
        item.longitude || item.lon || item.lng || 0,
        item.latitude || item.lat || 0
      ];
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates
      },
      properties: {
        id: item.ID || item.id,
        name: item.NAME || item.name || item.title,
        layerId: 'red-light-cameras',
        // Add more properties as needed
        ...item
      }
    };
  }
}