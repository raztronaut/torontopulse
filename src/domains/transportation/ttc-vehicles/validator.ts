import { DataValidator, ValidationResult } from '../../../core/data-sources/types';
import { TTCVehicle } from '../../../types';

export class TTCValidator implements DataValidator {
  validate(data: TTCVehicle[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validatedData: TTCVehicle[] = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array');
      return { valid: false, errors, warnings, data: [] };
    }

    data.forEach((vehicle, index) => {
      const vehicleErrors: string[] = [];

      // Required fields validation
      if (!vehicle.id) {
        vehicleErrors.push(`Vehicle ${index}: Missing required field 'id'`);
      }

      if (!vehicle.route) {
        vehicleErrors.push(`Vehicle ${index}: Missing required field 'route'`);
      }

      if (!vehicle.direction) {
        vehicleErrors.push(`Vehicle ${index}: Missing required field 'direction'`);
      }

      if (!vehicle.vehicle_type) {
        vehicleErrors.push(`Vehicle ${index}: Missing required field 'vehicle_type'`);
      }

      // Coordinate validation
      if (typeof vehicle.latitude !== 'number' || isNaN(vehicle.latitude)) {
        vehicleErrors.push(`Vehicle ${index}: Invalid latitude`);
      } else if (vehicle.latitude < -90 || vehicle.latitude > 90) {
        vehicleErrors.push(`Vehicle ${index}: Latitude out of range (-90 to 90)`);
      }

      if (typeof vehicle.longitude !== 'number' || isNaN(vehicle.longitude)) {
        vehicleErrors.push(`Vehicle ${index}: Invalid longitude`);
      } else if (vehicle.longitude < -180 || vehicle.longitude > 180) {
        vehicleErrors.push(`Vehicle ${index}: Longitude out of range (-180 to 180)`);
      }

      // Toronto bounds validation (rough bounds)
      if (vehicle.latitude && vehicle.longitude) {
        if (vehicle.latitude < 43.5 || vehicle.latitude > 44.0) {
          vehicleErrors.push(`Vehicle ${index}: Latitude outside Toronto area`);
        }
        if (vehicle.longitude < -79.8 || vehicle.longitude > -79.0) {
          vehicleErrors.push(`Vehicle ${index}: Longitude outside Toronto area`);
        }
      }

      // Vehicle type validation
      if (vehicle.vehicle_type && !['bus', 'streetcar', 'subway'].includes(vehicle.vehicle_type)) {
        vehicleErrors.push(`Vehicle ${index}: Invalid vehicle_type '${vehicle.vehicle_type}'`);
      }

      // Speed validation (reasonable limits)
      if (vehicle.speed !== undefined && typeof vehicle.speed === 'number') {
        if (vehicle.speed < 0 || vehicle.speed > 120) {
          vehicleErrors.push(`Vehicle ${index}: Unrealistic speed ${vehicle.speed} km/h`);
        }
      }

      // Bearing validation
      if (vehicle.bearing !== undefined && typeof vehicle.bearing === 'number') {
        if (vehicle.bearing < 0 || vehicle.bearing >= 360) {
          warnings.push(`Vehicle ${index}: Invalid bearing ${vehicle.bearing} (must be 0-359)`);
        }
      }

      // Timestamp validation
      if (vehicle.timestamp) {
        const timestamp = new Date(vehicle.timestamp);
        if (isNaN(timestamp.getTime())) {
          vehicleErrors.push(`Vehicle ${index}: Invalid timestamp format`);
        } else {
          // Check if timestamp is not too old (more than 1 hour)
          const now = new Date();
          const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
          if (timestamp < oneHourAgo) {
            vehicleErrors.push(`Vehicle ${index}: Timestamp too old (${timestamp.toISOString()})`);
          }
        }
      }

      if (vehicleErrors.length === 0) {
        validatedData.push(vehicle);
      } else {
        errors.push(...vehicleErrors);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data: validatedData
    };
  }
} 