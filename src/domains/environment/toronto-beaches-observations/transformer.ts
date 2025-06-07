import { DataTransformer } from '../../../core/data-sources/types.js';
import { GeoJSONFeatureCollection, GeoJSONFeature } from '../../../types/geojson.js';

/**
 * Transformer for Toronto Beaches Observations
 * Converts beach observation data to GeoJSON format
 */
export class TorontoBeachesObservationsTransformer implements DataTransformer {
  // Beach coordinates mapping (official coordinates from Toronto.ca and coordinate databases)
  private readonly beachCoordinates: Record<string, [number, number]> = {
    "Bluffer's Beach Park": [-79.2344, 43.7067], // Bluffer's Park area
    "Centre Island Beach": [-79.3687, 43.6234], // Centre Island coordinates
    "Cherry Beach": [-79.3443, 43.6368], // Cherry Beach coordinates
    "Gibraltar Point Beach": [-79.3850, 43.6200], // Gibraltar Point area
    "Hanlan's Point Beach": [-79.3944, 43.6139], // Hanlan's Point area
    "Kew Balmy Beach": [-79.2977, 43.6677], // Kew-Balmy Beach area
    "Marie Curtis Park East Beach": [-79.5500, 43.5850], // Marie Curtis Park area
    "Sunnyside Beach": [-79.4450, 43.6350], // Sunnyside Beach area
    "Ward's Island Beach": [-79.3500, 43.6150], // Ward's Island area
    "Woodbine Beaches": [-79.3089, 43.6622], // Woodbine Beach coordinates (verified)
  };

  transform(data: any): GeoJSONFeatureCollection {
    console.log('🏖️ Beach observations transformer called with data:', {
      type: typeof data,
      isArray: Array.isArray(data),
      keys: data && typeof data === 'object' ? Object.keys(data) : null,
      sampleData: data && Array.isArray(data) ? data[0] : data
    });
    
    try {
      // Handle array data directly
      let items: any[] = [];
      
      if (Array.isArray(data)) {
        items = data;
      } else if (typeof data === 'object' && data !== null) {
        // Try to extract from nested structure
        items = data.result?.records || data.result || data.data || [];
        if (!Array.isArray(items)) {
          items = [data];
        }
      }

      console.log('🏖️ Extracted items:', items.length, 'records');

      if (!Array.isArray(items) || items.length === 0) {
        console.warn('No valid beach observation data found');
        return { type: 'FeatureCollection', features: [] };
      }

      // Filter and sort to get only the most recent observation for each beach
      const recentObservations = this.getRecentObservations(items);

      const features: GeoJSONFeature[] = recentObservations
        .map(item => this.createFeature(item))
        .filter(feature => feature !== null) as GeoJSONFeature[];

      return {
        type: 'FeatureCollection',
        features
      };
    } catch (error) {
      console.error('Error transforming beach observations data:', error);
      return { type: 'FeatureCollection', features: [] };
    }
  }

  private getRecentObservations(items: any[]): any[] {
    // Group observations by beach name
    const beachGroups: Record<string, any[]> = {};
    
    items.forEach(item => {
      const beachName = item.beachName || item.beach_name || item.name;
      if (beachName) {
        if (!beachGroups[beachName]) {
          beachGroups[beachName] = [];
        }
        beachGroups[beachName].push(item);
      }
    });

    // For each beach, get the most recent observation
    const recentObservations: any[] = [];
    
    Object.entries(beachGroups).forEach(([beachName, observations]) => {
      // Sort by date (most recent first)
      const sortedObservations = observations.sort((a, b) => {
        const dateA = this.parseDate(a.dataCollectionDate || a.observationDate || a.sampleDate || a.date);
        const dateB = this.parseDate(b.dataCollectionDate || b.observationDate || b.sampleDate || b.date);
        
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        
        return dateB.getTime() - dateA.getTime();
      });

      // Take the most recent observation
      if (sortedObservations.length > 0) {
        recentObservations.push(sortedObservations[0]);
      }
    });

    return recentObservations;
  }

  private parseDate(dateString: any): Date | null {
    if (!dateString) return null;
    
    try {
      // Handle various date formats
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  private createFeature(item: any): GeoJSONFeature | null {
    try {
      // Extract beach name and coordinates
      const beachName = item.beachName || item.beach_name || item.name;
      if (!beachName) {
        console.warn('Beach observation missing beach name:', item);
        return null;
      }

      const coordinates = this.beachCoordinates[beachName];
      if (!coordinates) {
        console.warn(`Unknown beach: ${beachName}. Available beaches:`, Object.keys(this.beachCoordinates));
        return null;
      }

      // Create properties from the observation data
      const properties: Record<string, any> = {
        beachName,
        layerId: 'toronto-beaches-observations',
        type: 'beach-observation',
        // Include all available observation data
        ...item,
        // Ensure we have a readable description
        description: this.createDescription(item),
      };

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        properties
      };
    } catch (error) {
      console.error('Error creating feature for beach observation:', error, item);
      return null;
    }
  }

  private createDescription(item: any): string {
    const beachName = item.beachName || item.beach_name || item.name || 'Unknown Beach';
    const date = item.sampleDate || item.date || item.observationDate || 'Unknown Date';
    
    let description = `Beach observation at ${beachName}`;
    if (date) {
      description += ` on ${date}`;
    }

    // Add key observation details if available
    const details: string[] = [];
    
    if (item.waterTemp !== undefined) details.push(`Water temp: ${item.waterTemp}°C`);
    if (item.airTemp !== undefined) details.push(`Air temp: ${item.airTemp}°C`);
    if (item.turbidity !== undefined) details.push(`Turbidity: ${item.turbidity}`);
    if (item.waveAction !== undefined) details.push(`Wave action: ${item.waveAction}`);
    if (item.windDirection !== undefined) details.push(`Wind: ${item.windDirection}`);
    if (item.rainfall !== undefined) details.push(`Rainfall: ${item.rainfall}`);
    
    if (details.length > 0) {
      description += ` - ${details.join(', ')}`;
    }

    return description;
  }
}