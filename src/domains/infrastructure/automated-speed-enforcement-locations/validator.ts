import { DataValidator, ValidationResult } from '../../../core/data-sources/types.js';

/**
 * Validator for Automated Speed Enforcement Locations
 * Ensures data quality and geographic bounds for Toronto area
 */
export class AutomatedSpeedEnforcementLocationsValidator implements DataValidator {
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

            // TODO: Add validation logic for your data format

      // Validate geographic coordinates if present
      this.validateGeographicData(data, warnings);

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

  private validateGeographicData(data: any, warnings: string[]): void {
    // TODO: Implement geographic validation based on your data structure
    // This is a placeholder - adapt to your specific data format
    
    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        const lat = item.latitude || item.lat;
        const lon = item.longitude || item.lon || item.lng;
        
        if (lat && lon) {
          if (!this.isInTorontoBounds(lat, lon)) {
            warnings.push(`Item ${index}: coordinates (${lat}, ${lon}) outside Toronto bounds`);
          }
        }
      });
    }
  }

  private isInTorontoBounds(lat: number, lon: number): boolean {
    return lat >= this.TORONTO_BOUNDS.south &&
           lat <= this.TORONTO_BOUNDS.north &&
           lon >= this.TORONTO_BOUNDS.west &&
           lon <= this.TORONTO_BOUNDS.east;
  }
}