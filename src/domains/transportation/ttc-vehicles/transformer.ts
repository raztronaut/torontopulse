import { DataTransformer } from '../../../core/data-sources/types';
import { TTCVehicle } from '../../../types';
import type { FeatureCollection, Feature, Point } from 'geojson';

export class TTCTransformer implements DataTransformer {
  transform(data: TTCVehicle[]): FeatureCollection {
    const features: Feature[] = data
      .filter(vehicle => 
        vehicle.latitude && 
        vehicle.longitude && 
        vehicle.latitude !== 0 && 
        vehicle.longitude !== 0
      )
      .map(vehicle => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [vehicle.longitude, vehicle.latitude]
        } as Point,
        properties: {
          layerId: 'ttc-vehicles',
          id: vehicle.id,
          route: vehicle.route,
          route_name: vehicle.route_name,
          direction: vehicle.direction,
          vehicle_type: vehicle.vehicle_type,
          next_stop: vehicle.next_stop,
          delay: vehicle.delay || 0,
          timestamp: vehicle.timestamp,
          trip_id: vehicle.trip_id,
          stop_id: vehicle.stop_id,
          bearing: vehicle.bearing,
          speed: vehicle.speed,
          occupancy_status: vehicle.occupancy_status,
          vehicle_label: vehicle.vehicle_label,
          // Additional properties for visualization
          title: `${vehicle.vehicle_type === 'streetcar' ? '🚋' : vehicle.vehicle_type === 'bus' ? '🚌' : '🚇'} Route ${vehicle.route}`,
          description: `${vehicle.direction} - ${vehicle.route_name || vehicle.route}`
        }
      }));

    return {
      type: 'FeatureCollection',
      features
    };
  }
} 