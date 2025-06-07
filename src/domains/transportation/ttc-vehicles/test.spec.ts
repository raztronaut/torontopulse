import { describe, it, expect, vi } from 'vitest';
import { TTCVehiclesPlugin } from './index';
import { TTCFetcher } from './fetcher';
import { TTCTransformer } from './transformer';
import { TTCValidator } from './validator';
import { TTCVehicle } from '../../../types';

// Mock axios to avoid actual API calls during testing
vi.mock('axios', () => ({
  default: {
    get: vi.fn()
  },
  isAxiosError: vi.fn(() => false)
}));

describe('TTC Vehicles Plugin', () => {
  let plugin: TTCVehiclesPlugin;

  beforeEach(() => {
    plugin = new TTCVehiclesPlugin();
  });

  it('should have correct metadata', () => {
    expect(plugin.metadata.id).toBe('ttc-vehicles');
    expect(plugin.metadata.name).toBe('TTC Live Vehicles');
    expect(plugin.metadata.domain).toBe('transportation');
    expect(plugin.metadata.reliability).toBe('high');
  });

  it('should have required components', () => {
    expect(plugin.fetcher).toBeInstanceOf(TTCFetcher);
    expect(plugin.transformer).toBeInstanceOf(TTCTransformer);
    expect(plugin.validator).toBeInstanceOf(TTCValidator);
  });

  describe('TTCValidator', () => {
    let validator: TTCValidator;

    beforeEach(() => {
      validator = new TTCValidator();
    });

    it('should validate valid TTC vehicle data', () => {
      const validVehicles: TTCVehicle[] = [
        {
          id: 'test-vehicle-1',
          route: '501',
          direction: 'Eastbound',
          latitude: 43.6532,
          longitude: -79.3832,
          vehicle_type: 'streetcar',
          timestamp: new Date().toISOString()
        }
      ];

      const result = validator.validate(validVehicles);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toHaveLength(1);
    });

    it('should reject invalid coordinates', () => {
      const invalidVehicles: TTCVehicle[] = [
        {
          id: 'test-vehicle-1',
          route: '501',
          direction: 'Eastbound',
          latitude: 200, // Invalid latitude
          longitude: -79.3832,
          vehicle_type: 'streetcar',
          timestamp: new Date().toISOString()
        }
      ];

      const result = validator.validate(invalidVehicles);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.data).toHaveLength(0);
    });

    it('should reject vehicles outside Toronto area', () => {
      const outsideVehicles: TTCVehicle[] = [
        {
          id: 'test-vehicle-1',
          route: '501',
          direction: 'Eastbound',
          latitude: 40.7128, // New York latitude
          longitude: -74.0060, // New York longitude
          vehicle_type: 'streetcar',
          timestamp: new Date().toISOString()
        }
      ];

      const result = validator.validate(outsideVehicles);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('outside Toronto area'))).toBe(true);
    });
  });

  describe('TTCTransformer', () => {
    let transformer: TTCTransformer;

    beforeEach(() => {
      transformer = new TTCTransformer();
    });

    it('should transform TTC vehicles to GeoJSON', () => {
      const vehicles: TTCVehicle[] = [
        {
          id: 'test-vehicle-1',
          route: '501',
          route_name: 'Queen',
          direction: 'Eastbound',
          latitude: 43.6532,
          longitude: -79.3832,
          vehicle_type: 'streetcar',
          timestamp: new Date().toISOString(),
          speed: 25,
          bearing: 90
        }
      ];

      const geoJSON = transformer.transform(vehicles);
      
      expect(geoJSON.type).toBe('FeatureCollection');
      expect(geoJSON.features).toHaveLength(1);
      
      const feature = geoJSON.features[0];
      expect(feature.type).toBe('Feature');
      expect(feature.geometry.type).toBe('Point');
      expect(feature.geometry.coordinates).toEqual([-79.3832, 43.6532]);
      expect(feature.properties.layerId).toBe('ttc-vehicles');
      expect(feature.properties.route).toBe('501');
      expect(feature.properties.vehicle_type).toBe('streetcar');
    });

    it('should filter out vehicles with invalid coordinates', () => {
      const vehicles: TTCVehicle[] = [
        {
          id: 'valid-vehicle',
          route: '501',
          direction: 'Eastbound',
          latitude: 43.6532,
          longitude: -79.3832,
          vehicle_type: 'streetcar',
          timestamp: new Date().toISOString()
        },
        {
          id: 'invalid-vehicle',
          route: '502',
          direction: 'Westbound',
          latitude: 0, // Invalid
          longitude: 0, // Invalid
          vehicle_type: 'bus',
          timestamp: new Date().toISOString()
        }
      ];

      const geoJSON = transformer.transform(vehicles);
      
      expect(geoJSON.features).toHaveLength(1);
      expect(geoJSON.features[0].properties.id).toBe('valid-vehicle');
    });
  });

  describe('Plugin lifecycle', () => {
    it('should call lifecycle methods', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await plugin.onLoad();
      await plugin.onEnable();
      await plugin.onDisable();
      await plugin.onUnload();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Loading TTC Live Vehicles'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Enabled TTC Live Vehicles'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Disabled TTC Live Vehicles'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unloading TTC Live Vehicles'));
      
      consoleSpy.mockRestore();
    });
  });
}); 