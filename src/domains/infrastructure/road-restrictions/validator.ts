import { DataValidator, ValidationResult } from '../../../core/data-sources/types.js';
import { GeoJSONFeatureCollection, GeoJSONFeature } from '../../../types/geojson.js';

/**
 * Validator for Road Restrictions
 * Ensures data quality and geographic bounds for Toronto area
 */
export class RoadRestrictionsValidator implements DataValidator {
  // Toronto bounding box (approximately)
  private readonly TORONTO_BOUNDS = {
    north: 43.85,
    south: 43.58,
    east: -79.12,
    west: -79.64
  };

  validate(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate data structure
      if (!data) {
        errors.push('Data is null or undefined');
        return { valid: false, errors, warnings };
      }

      // Expect a GeoJSON FeatureCollection
      if (!data.type || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
        errors.push('Expected GeoJSON FeatureCollection with features array');
        return { valid: false, errors, warnings };
      }

      if (data.features.length === 0) {
        warnings.push('FeatureCollection is empty');
      }

      // Validate geographic coordinates if present
      this.validateGeographicData(data.features, warnings);

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push(`Validation error: ${error}`);
      return { valid: false, errors, warnings };
    }
  }

  private validateGeographicData(features: GeoJSONFeature[], warnings: string[]): void {
    features.forEach((feature, index) => {
      if (!feature.geometry) {
        warnings.push(`Feature ${index}: missing geometry`);
        return;
      }
      let lat: number | undefined;
      let lon: number | undefined;
      if (feature.geometry.type === 'Point') {
        lon = feature.geometry.coordinates[0];
        lat = feature.geometry.coordinates[1];
      } else if (feature.geometry.type === 'LineString' && feature.geometry.coordinates.length > 0) {
        lon = feature.geometry.coordinates[0][0];
        lat = feature.geometry.coordinates[0][1];
      }
      if (lat !== undefined && lon !== undefined) {
        if (!this.isInTorontoBounds(lat, lon)) {
          warnings.push(`Feature ${index}: coordinates (${lat}, ${lon}) outside Toronto bounds`);
        }
      }
    });
  }

  private isInTorontoBounds(lat: number, lon: number): boolean {
    return lat >= this.TORONTO_BOUNDS.south &&
           lat <= this.TORONTO_BOUNDS.north &&
           lon >= this.TORONTO_BOUNDS.west &&
           lon <= this.TORONTO_BOUNDS.east;
  }
}