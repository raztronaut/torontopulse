import type { FeatureCollection, Feature, Point, Geometry } from 'geojson';

export interface DataTransformer {
  transform(data: any): Promise<FeatureCollection>;
}

export interface TransformConfig {
  latField: string;
  lonField: string;
  idField: string;
  properties: Record<string, string>;
}

export interface FieldMapping {
  source: string;
  target: string;
  type?: 'string' | 'number' | 'boolean' | 'date';
  transform?: (value: any) => any;
}

export interface GeometryConfig {
  type: 'point' | 'linestring' | 'polygon';
  coordinates: {
    lat: string;
    lon: string;
  } | {
    path: string;
  };
}

export abstract class BaseTransformer implements DataTransformer {
  protected config: TransformConfig;

  constructor(config: TransformConfig) {
    this.config = config;
  }

  abstract transform(data: any): Promise<FeatureCollection>;

  protected createFeature(
    geometry: Geometry,
    properties: Record<string, any>,
    id?: string | number
  ): Feature {
    return {
      type: 'Feature',
      geometry,
      properties,
      ...(id && { id })
    };
  }

  protected createPoint(lat: number, lon: number): Point {
    return {
      type: 'Point',
      coordinates: [lon, lat] // GeoJSON uses [longitude, latitude]
    };
  }

  protected createFeatureCollection(
    features: Feature[]
  ): FeatureCollection {
    return {
      type: 'FeatureCollection',
      features
    };
  }

  protected extractValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (key.startsWith('@')) {
        // Handle XML attributes (e.g., @lat)
        return current?.[key.substring(1)];
      }
      return current?.[key];
    }, obj);
  }

  protected mapProperties(
    source: any,
    mappings: Record<string, string>
  ): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [targetKey, sourcePath] of Object.entries(mappings)) {
      const value = this.extractValue(source, sourcePath);
      if (value !== undefined && value !== null) {
        result[targetKey] = value;
      }
    }
    
    return result;
  }

  protected validateCoordinates(lat: any, lon: any): boolean {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    return !isNaN(latitude) && 
           !isNaN(longitude) && 
           latitude >= -90 && 
           latitude <= 90 && 
           longitude >= -180 && 
           longitude <= 180;
  }
} 