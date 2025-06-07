import { DataValidator, ValidationResult } from '../../../core/data-sources/types.js';
import { GeoJSONFeatureCollection } from '../../../types/geojson.js';

/**
 * Validator for Toronto Beaches Observations
 * Ensures data quality and geographic bounds for Toronto beach observation data
 */
export class TorontoBeachesObservationsValidator implements DataValidator {
  // Toronto bounding box (approximately) - expanded to include Toronto Islands
  private readonly TORONTO_BOUNDS = {
    north: 43.85,
    south: 43.58,
    east: -79.12,
    west: -79.64
  };

  validate(data: GeoJSONFeatureCollection): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate GeoJSON structure
      if (!data) {
        errors.push('Data is null or undefined');
        return { valid: false, errors, warnings, data };
      }

      if (data.type !== 'FeatureCollection') {
        errors.push('Expected GeoJSON FeatureCollection');
        return { valid: false, errors, warnings, data };
      }

      if (!Array.isArray(data.features)) {
        errors.push('Expected features array in GeoJSON');
        return { valid: false, errors, warnings, data };
      }

      if (data.features.length === 0) {
        warnings.push('No beach observation features found');
      }

      // Validate each feature
      this.validateFeatures(data.features, errors, warnings);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        data
      };
    } catch (error) {
      errors.push(`Validation error: ${error}`);
      return { valid: false, errors, warnings, data };
    }
  }

  private validateFeatures(features: any[], errors: string[], warnings: string[]): void {
    features.forEach((feature, index) => {
      // Validate feature structure
      if (feature.type !== 'Feature') {
        errors.push(`Feature ${index}: Invalid feature type`);
        return;
      }

      if (!feature.geometry || feature.geometry.type !== 'Point') {
        errors.push(`Feature ${index}: Expected Point geometry`);
        return;
      }

      if (!Array.isArray(feature.geometry.coordinates) || feature.geometry.coordinates.length !== 2) {
        errors.push(`Feature ${index}: Invalid coordinates array`);
        return;
      }

      const [lon, lat] = feature.geometry.coordinates;
      
      // Validate coordinates
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        errors.push(`Feature ${index}: Coordinates must be numbers`);
        return;
      }

      if (isNaN(lat) || isNaN(lon)) {
        errors.push(`Feature ${index}: Invalid coordinate values`);
        return;
      }

      // Check Toronto bounds
      if (!this.isInTorontoBounds(lat, lon)) {
        warnings.push(`Feature ${index}: Beach coordinates (${lat.toFixed(4)}, ${lon.toFixed(4)}) outside Toronto bounds`);
      }

      // Validate beach observation properties
      this.validateBeachProperties(feature.properties, index, warnings);
    });
  }

  private validateBeachProperties(properties: any, index: number, warnings: string[]): void {
    if (!properties) {
      warnings.push(`Feature ${index}: Missing properties`);
      return;
    }

    // Check for beach name
    if (!properties.beachName && !properties.name) {
      warnings.push(`Feature ${index}: Missing beach name`);
    }

    // Validate water temperature if present
    if (properties.waterTemp !== undefined && properties.waterTemp !== null) {
      const temp = parseFloat(properties.waterTemp);
      if (isNaN(temp)) {
        warnings.push(`Feature ${index}: Invalid water temperature value`);
      } else if (temp < -5 || temp > 35) {
        warnings.push(`Feature ${index}: Water temperature ${temp}°C seems unusual for Toronto`);
      }
    }

    // Validate turbidity if present
    if (properties.turbidity && typeof properties.turbidity === 'string') {
      const validTurbidity = ['Clear', 'Cloudy', 'Murky'];
      if (!validTurbidity.includes(properties.turbidity)) {
        warnings.push(`Feature ${index}: Unusual turbidity value: ${properties.turbidity}`);
      }
    }

    // Validate observation date if present
    if (properties.observationDate) {
      const date = new Date(properties.observationDate);
      if (isNaN(date.getTime())) {
        warnings.push(`Feature ${index}: Invalid observation date format`);
      } else {
        const now = new Date();
        const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 365) {
          warnings.push(`Feature ${index}: Observation date is over a year old`);
        }
      }
    }
  }

  private isInTorontoBounds(lat: number, lon: number): boolean {
    return lat >= this.TORONTO_BOUNDS.south &&
           lat <= this.TORONTO_BOUNDS.north &&
           lon >= this.TORONTO_BOUNDS.west &&
           lon <= this.TORONTO_BOUNDS.east;
  }
}