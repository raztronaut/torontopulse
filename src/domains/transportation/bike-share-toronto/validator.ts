import { DataValidator, ValidationResult } from '../../../core/data-sources/types';
import { BikeStation } from '../../../types';

/**
 * Validator for Bike Share Toronto
 * Ensures data quality and geographic bounds for Toronto area
 */
export class BikeShareTorontoValidator implements DataValidator {
  validate(data: BikeStation[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validatedData: BikeStation[] = [];

    if (!Array.isArray(data)) {
      return {
        valid: false,
        errors: ['Data is not an array'],
        warnings: [],
        data: []
      };
    }

    if (data.length === 0) {
      return {
        valid: false,
        errors: ['No bike stations found'],
        warnings: [],
        data: []
      };
    }

    data.forEach((station, index) => {
      const stationErrors: string[] = [];

      // Required field validation
      if (!station.id) {
        stationErrors.push(`Station ${index}: Missing id`);
      }
      if (!station.name) {
        stationErrors.push(`Station ${index}: Missing name`);
      }
      if (typeof station.latitude !== 'number') {
        stationErrors.push(`Station ${index}: Invalid latitude`);
      }
      if (typeof station.longitude !== 'number') {
        stationErrors.push(`Station ${index}: Invalid longitude`);
      }

      // Toronto geographic bounds validation (rough bounds)
      if (station.latitude && station.longitude) {
        if (station.latitude < 43.5 || station.latitude > 44.0) {
          stationErrors.push(`Station ${index}: Latitude ${station.latitude} outside Toronto area`);
        }
        if (station.longitude < -79.8 || station.longitude > -79.0) {
          stationErrors.push(`Station ${index}: Longitude ${station.longitude} outside Toronto area`);
        }
      }

      // Capacity validation
      if (typeof station.capacity !== 'number' || station.capacity <= 0) {
        stationErrors.push(`Station ${index}: Invalid capacity ${station.capacity}`);
      }

      // Availability validation
      if (typeof station.bikes_available !== 'number' || station.bikes_available < 0) {
        stationErrors.push(`Station ${index}: Invalid bikes_available ${station.bikes_available}`);
      }
      if (typeof station.docks_available !== 'number' || station.docks_available < 0) {
        stationErrors.push(`Station ${index}: Invalid docks_available ${station.docks_available}`);
      }

      // Logic validation: bikes + docks should not exceed capacity (with some tolerance for bike movements)
      if (station.capacity && station.bikes_available !== undefined && station.docks_available !== undefined) {
        const total = station.bikes_available + station.docks_available;
        if (total > station.capacity + 2) { // Allow 2 bike tolerance for bikes in transit
          warnings.push(`Station ${index} (${station.name}): Total bikes+docks (${total}) exceeds capacity (${station.capacity})`);
        }
        if (total < station.capacity - 5) { // Warn if significantly under capacity
          warnings.push(`Station ${index} (${station.name}): Total bikes+docks (${total}) significantly below capacity (${station.capacity})`);
        }
      }

      // Status validation
      if (typeof station.is_installed !== 'boolean') {
        stationErrors.push(`Station ${index}: Invalid is_installed value`);
      }
      if (typeof station.is_renting !== 'boolean') {
        stationErrors.push(`Station ${index}: Invalid is_renting value`);
      }
      if (typeof station.is_returning !== 'boolean') {
        stationErrors.push(`Station ${index}: Invalid is_returning value`);
      }

      // Timestamp validation
      if (station.last_reported) {
        const reportedTime = new Date(station.last_reported);
        if (isNaN(reportedTime.getTime())) {
          stationErrors.push(`Station ${index}: Invalid last_reported timestamp`);
        } else {
          // Check if timestamp is not too old (more than 24 hours)
          const now = new Date();
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          if (reportedTime < oneDayAgo) {
            warnings.push(`Station ${index} (${station.name}): Data is stale (${reportedTime.toISOString()})`);
          }
        }
      }

      // Operational warnings
      if (station.is_installed && !station.is_renting && !station.is_returning) {
        warnings.push(`Station ${index} (${station.name}): Station is installed but not operational`);
      }
      if (station.bikes_available === 0 && station.is_renting) {
        warnings.push(`Station ${index} (${station.name}): No bikes available but station is accepting rentals`);
      }
      if (station.docks_available === 0 && station.is_returning) {
        warnings.push(`Station ${index} (${station.name}): No docks available but station is accepting returns`);
      }

      if (stationErrors.length === 0) {
        validatedData.push(station);
      } else {
        errors.push(...stationErrors);
      }
    });

    // Summary validation
    const installedStations = validatedData.filter(s => s.is_installed).length;
    const operationalStations = validatedData.filter(s => s.is_renting && s.is_returning).length;
    const totalBikes = validatedData.reduce((sum, s) => sum + (s.bikes_available || 0), 0);
    const totalDocks = validatedData.reduce((sum, s) => sum + (s.docks_available || 0), 0);

    if (installedStations < 50) {
      warnings.push(`Low number of installed stations: ${installedStations} (expected 500+)`);
    }
    if (operationalStations / installedStations < 0.9) {
      warnings.push(`Low operational ratio: ${(operationalStations / installedStations * 100).toFixed(1)}% stations operational`);
    }

    console.log(`Bike Share validation: ${validatedData.length} valid stations, ${totalBikes} bikes, ${totalDocks} docks available`);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data: validatedData
    };
  }
}