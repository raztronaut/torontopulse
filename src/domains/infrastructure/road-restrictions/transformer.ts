import { DataTransformer } from '../../../core/data-sources/types.js';
import { GeoJSONFeatureCollection, GeoJSONFeature } from '../../../types/geojson.js';

/**
 * Transformer for Road Restrictions
 * Converts JSON data to GeoJSON format
 */
export class RoadRestrictionsTransformer implements DataTransformer {
  transform(data: any): GeoJSONFeatureCollection {
    try {
      // Handle the API response structure - extract the array from the root object
      let items = data;
      
      // The API returns an object with a "Closure" property containing the array
      if (typeof data === 'object' && !Array.isArray(data)) {
        if (data.Closure && Array.isArray(data.Closure)) {
          items = data.Closure;
        } else {
          // Check for any array property as fallback
          const keys = Object.keys(data);
          const arrayKey = keys.find(key => Array.isArray(data[key]));
          if (arrayKey) {
            items = data[arrayKey];
          } else {
            throw new Error(`Expected object with array property. Found keys: ${keys.join(', ')}`);
          }
        }
      }

      if (!Array.isArray(items)) {
        throw new Error(`Expected array of road restriction items, got: ${typeof items}`);
      }

      const features = items.map(item => this.createFeature(item));

      return {
        type: 'FeatureCollection',
        features
      };
    } catch (error) {
      console.error(`Error transforming Road Restrictions data:`, error);
      throw error;
    }
  }

  private createFeature(item: any): GeoJSONFeature {
    // Parse geoPolyline into coordinates
    let geometry: any = {
      type: 'Point',
      coordinates: [
        parseFloat(item.longitude),
        parseFloat(item.latitude)
      ]
    };

    // If geoPolyline exists, parse it to create line or polygon geometry
    if (item.geoPolyline) {
      try {
        const coordinates = this.parseGeoPolyline(item.geoPolyline);
        if (coordinates.length > 1) {
          geometry = {
            type: 'LineString',
            coordinates
          };
        }
      } catch (error) {
        console.warn('Failed to parse geoPolyline, using point geometry:', error);
      }
    }

    return {
      type: 'Feature',
      geometry,
      properties: {
        id: item.id,
        name: item.name,
        road: item.road,
        district: item.district,
        roadClass: item.roadClass,
        description: item.description,
        type: item.type,
        subType: item.subType,
        workEventType: item.workEventType,
        contractor: item.contractor,
        directionsAffected: item.directionsAffected,
        maxImpact: item.maxImpact,
        currImpact: item.currImpact,
        workPeriod: item.workPeriod,
        startTime: item.startTime ? new Date(parseInt(item.startTime)) : null,
        endTime: item.endTime ? new Date(parseInt(item.endTime)) : null,
        lastUpdated: item.lastUpdated ? new Date(parseInt(item.lastUpdated)) : null,
        specialEvent: item.specialEvent,
        URL: item.URL,
        fromRoad: item.fromRoad,
        toRoad: item.toRoad,
        atRoad: item.atRoad
      }
    };
  }

  private parseGeoPolyline(geoPolyline: string): number[][] {
    // Parse the coordinate string format: "[-79.461040,43.677430],[-79.460990,43.677310]"
    if (!geoPolyline || geoPolyline.trim() === '') {
      return [];
    }

    const coordinateMatches = geoPolyline.match(/\[([^\]]+)\]/g);
    if (!coordinateMatches) {
      return [];
    }

    return coordinateMatches.map(match => {
      const coords = match.slice(1, -1).split(',').map(Number);
      return [coords[0], coords[1]]; // [longitude, latitude]
    });
  }
}