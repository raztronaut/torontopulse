import type { FeatureCollection, Feature } from 'geojson';
import { BaseTransformer, TransformConfig } from './base';

export class JSONToGeoJSONTransformer extends BaseTransformer {
  constructor(config: TransformConfig) {
    super(config);
  }

  async transform(data: any): Promise<FeatureCollection> {
    try {
      // Handle different JSON structures
      let items: any[] = [];
      
      if (Array.isArray(data)) {
        items = data;
      } else if (data.data && Array.isArray(data.data)) {
        items = data.data;
      } else if (data.results && Array.isArray(data.results)) {
        items = data.results;
      } else if (data.records && Array.isArray(data.records)) {
        items = data.records;
      } else {
        throw new Error('Unable to extract array from JSON data');
      }

      const features: Feature[] = [];

      for (const item of items) {
        try {
          const lat = this.extractValue(item, this.config.latField);
          const lon = this.extractValue(item, this.config.lonField);
          
          if (!this.validateCoordinates(lat, lon)) {
            console.warn('Invalid coordinates, skipping item:', { lat, lon });
            continue;
          }

          const geometry = this.createPoint(parseFloat(lat), parseFloat(lon));
          const properties = this.mapProperties(item, this.config.properties);
          const id = this.extractValue(item, this.config.idField);

          const feature = this.createFeature(geometry, properties, id);
          features.push(feature);
        } catch (error) {
          console.warn('Error processing item, skipping:', error);
          continue;
        }
      }

      console.log(`Successfully transformed ${features.length} features from JSON`);
      return this.createFeatureCollection(features);
    } catch (error) {
      console.error('Error transforming JSON to GeoJSON:', error);
      throw error;
    }
  }
} 