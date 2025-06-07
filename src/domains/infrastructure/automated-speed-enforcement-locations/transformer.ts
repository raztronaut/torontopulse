import { DataTransformer } from '../../../core/data-sources/types.js';
import { GeoJSONFeatureCollection, GeoJSONFeature } from '../../../types/geojson.js';

/**
 * Transformer for Automated Speed Enforcement Locations
 * Converts GEOJSON data to GeoJSON format
 */
export class AutomatedSpeedEnforcementLocationsTransformer implements DataTransformer {
  transform(data: any): GeoJSONFeatureCollection {
    try {
            // Extract nested array if required
      let items: any = data;
      if (typeof data === 'object' && !Array.isArray(data)) {
        if (data.result && data.result.records) {
          items = data.result.records;
        } else if (data.records) {
          items = data.records;
        }
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
      console.error(`Error transforming Automated Speed Enforcement Locations data:`, error);
      throw error;
    }
  }

  private createFeature(item: any): GeoJSONFeature {
    // Parse geometry from JSON string if it exists
    let coordinates: [number, number] = [0, 0];
    
    if (item.geometry) {
      try {
        const geom = JSON.parse(item.geometry);
        if (geom.type === 'Point' && geom.coordinates) {
          coordinates = [geom.coordinates[0], geom.coordinates[1]];
        }
      } catch (e) {
        console.warn('Failed to parse geometry:', item.geometry);
      }
    }
    
    // Fallback to direct coordinate fields
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
        id: item._id || item.id,
        location_code: item.Location_Code,
        ward: item.ward,
        status: item.Status,
        location: item.location,
        fid: item.FID,
        // Include all original properties
        ...item
      }
    };
  }
}