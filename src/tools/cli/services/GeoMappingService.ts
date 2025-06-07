import { FieldMetadata } from '../types.js';

export interface GeoStrategy {
  type: 'coordinates' | 'address' | 'location-name' | 'none';
  latField?: string;
  lonField?: string;
  addressField?: string;
  locationField?: string;
  confidence: number;
  transformationNeeded: boolean;
}

export interface CoordinateMap {
  [locationName: string]: [number, number]; // [longitude, latitude]
}

export class GeoMappingService {
  async detectGeographicData(fields: FieldMetadata[]): Promise<GeoStrategy> {
    // Try to detect coordinate fields first
    const coordinateStrategy = this.detectCoordinateFields(fields);
    if (coordinateStrategy.confidence > 0.8) {
      return coordinateStrategy;
    }

    // Try to detect address fields
    const addressStrategy = this.detectAddressFields(fields);
    if (addressStrategy.confidence > 0.6) {
      return addressStrategy;
    }

    // Try to detect location name fields
    const locationStrategy = this.detectLocationNameFields(fields);
    if (locationStrategy.confidence > 0.5) {
      return locationStrategy;
    }

    return {
      type: 'none',
      confidence: 0,
      transformationNeeded: false
    };
  }

  private detectCoordinateFields(fields: FieldMetadata[]): GeoStrategy {
    const latFields = fields.filter(f => 
      /lat|latitude/i.test(f.name) || f.semanticType === 'latitude'
    );
    const lonFields = fields.filter(f => 
      /lon|lng|longitude/i.test(f.name) || f.semanticType === 'longitude'
    );

    if (latFields.length > 0 && lonFields.length > 0) {
      const latField = latFields[0];
      const lonField = lonFields[0];
      
      // Check if values look like coordinates
      const latConfidence = this.validateCoordinateField(latField, 'latitude');
      const lonConfidence = this.validateCoordinateField(lonField, 'longitude');
      
      return {
        type: 'coordinates',
        latField: latField.name,
        lonField: lonField.name,
        confidence: Math.min(latConfidence, lonConfidence),
        transformationNeeded: false
      };
    }

    return { type: 'none', confidence: 0, transformationNeeded: false };
  }

  private detectAddressFields(fields: FieldMetadata[]): GeoStrategy {
    const addressFields = fields.filter(f => 
      /address|street|location|place/i.test(f.name) && 
      f.type === 'string'
    );

    if (addressFields.length > 0) {
      const addressField = addressFields[0];
      const confidence = this.validateAddressField(addressField);
      
      return {
        type: 'address',
        addressField: addressField.name,
        confidence,
        transformationNeeded: true
      };
    }

    return { type: 'none', confidence: 0, transformationNeeded: false };
  }

  private detectLocationNameFields(fields: FieldMetadata[]): GeoStrategy {
    const locationFields = fields.filter(f => 
      (/name|location|place|site|beach|park|station/i.test(f.name) && f.type === 'string') ||
      f.semanticType === 'location'
    );

    if (locationFields.length > 0) {
      const locationField = locationFields[0];
      const confidence = this.validateLocationNameField(locationField);
      
      return {
        type: 'location-name',
        locationField: locationField.name,
        confidence,
        transformationNeeded: true
      };
    }

    return { type: 'none', confidence: 0, transformationNeeded: false };
  }

  private validateCoordinateField(field: FieldMetadata, type: 'latitude' | 'longitude'): number {
    if (field.type !== 'number' && field.format !== 'decimal') {
      return 0.3; // Low confidence for non-numeric fields
    }

    if (!field.sampleValues || field.sampleValues.length === 0) {
      return 0.5; // Medium confidence without sample data
    }

    const values = field.sampleValues.map(v => parseFloat(String(v))).filter(v => !isNaN(v));
    if (values.length === 0) return 0.1;

    if (type === 'latitude') {
      // Toronto latitude range: approximately 43.58 to 43.85
      const validValues = values.filter(v => v >= 43.0 && v <= 44.0);
      return validValues.length / values.length;
    } else {
      // Toronto longitude range: approximately -79.64 to -79.12
      const validValues = values.filter(v => v >= -80.0 && v <= -79.0);
      return validValues.length / values.length;
    }
  }

  private validateAddressField(field: FieldMetadata): number {
    if (!field.sampleValues || field.sampleValues.length === 0) {
      return 0.4; // Medium-low confidence without sample data
    }

    const addressPatterns = [
      /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd)/i,
      /\d+\s+\w+/,
      /toronto|ontario|on/i
    ];

    let matches = 0;
    for (const value of field.sampleValues) {
      const str = String(value);
      if (addressPatterns.some(pattern => pattern.test(str))) {
        matches++;
      }
    }

    return matches / field.sampleValues.length;
  }

  private validateLocationNameField(field: FieldMetadata): number {
    if (!field.sampleValues || field.sampleValues.length === 0) {
      return 0.3; // Low confidence without sample data
    }

    // Check if values match known Toronto locations
    const torontoLocationPatterns = [
      /beach|park|station|centre|center|square|island/i,
      /toronto|scarborough|etobicoke|north york|york/i,
      /\b(ttc|subway|bus|streetcar)\b/i
    ];

    let matches = 0;
    for (const value of field.sampleValues) {
      const str = String(value);
      if (torontoLocationPatterns.some(pattern => pattern.test(str))) {
        matches++;
      }
    }

    return Math.min(0.8, matches / field.sampleValues.length + 0.2);
  }

  async generateCoordinateMapping(locationField: string, sampleValues: string[]): Promise<CoordinateMap> {
    const mapping: CoordinateMap = {};
    
    // Get built-in Toronto locations
    const builtInLocations = this.getBuiltInTorontoLocations();
    
    for (const value of sampleValues) {
      const normalizedValue = this.normalizeLocationName(value);
      
      // Check built-in locations first
      const coordinates = builtInLocations[normalizedValue];
      if (coordinates) {
        mapping[value] = coordinates;
        continue;
      }

      // Try fuzzy matching
      const fuzzyMatch = this.findFuzzyMatch(normalizedValue, builtInLocations);
      if (fuzzyMatch) {
        mapping[value] = fuzzyMatch;
        continue;
      }

      // For unknown locations, we'd typically use a geocoding service
      // For now, mark as needing manual mapping
      console.warn(`Unknown location: ${value} - manual mapping required`);
    }

    return mapping;
  }

  private getBuiltInTorontoLocations(): CoordinateMap {
    return {
      // Beaches
      'centre island beach': [-79.378, 43.620],
      'cherry beach': [-79.340, 43.640],
      'woodbine beach': [-79.309, 43.663],
      'kew beach': [-79.297, 43.668],
      'balmy beach': [-79.293, 43.671],
      'rouge beach': [-79.135, 43.795],
      'bluffer\'s park beach': [-79.234, 43.711],
      'hanlan\'s point beach': [-79.395, 43.613],
      'gibraltar point beach': [-79.385, 43.615],
      'centre island': [-79.378, 43.620],
      'ward\'s island': [-79.353, 43.613],

      // Major intersections and landmarks
      'yonge and bloor': [-79.386, 43.670],
      'yonge and eglinton': [-79.398, 43.706],
      'yonge and sheppard': [-79.411, 43.761],
      'king and bay': [-79.381, 43.648],
      'queen and spadina': [-79.400, 43.648],
      'dundas square': [-79.380, 43.656],
      'union station': [-79.381, 43.645],
      'pearson airport': [-79.631, 43.677],
      'billy bishop airport': [-79.396, 43.627],

      // Neighborhoods
      'downtown': [-79.383, 43.653],
      'midtown': [-79.395, 43.700],
      'north york': [-79.411, 43.761],
      'scarborough': [-79.230, 43.773],
      'etobicoke': [-79.565, 43.720],
      'york': [-79.487, 43.689],
      'east york': [-79.337, 43.696],

      // Parks and major areas
      'high park': [-79.463, 43.646],
      'trinity bellwoods': [-79.419, 43.647],
      'christie pits': [-79.420, 43.665],
      'riverdale park': [-79.358, 43.667],
      'harbourfront': [-79.380, 43.640],
      'distillery district': [-79.360, 43.650],
      'liberty village': [-79.418, 43.638],
      'cityplace': [-79.395, 43.643],

      // TTC Stations (major ones)
      'bloor-yonge station': [-79.386, 43.670],
      'st. george station': [-79.399, 43.668],
      'spadina station': [-79.404, 43.667],
      'kennedy station': [-79.264, 43.733],
      'kipling station': [-79.535, 43.636],
      'finch station': [-79.414, 43.780],
      'downsview park station': [-79.478, 43.753]
    };
  }

  private normalizeLocationName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\bstation\b/g, 'station')
      .replace(/\bbeach\b/g, 'beach')
      .replace(/\bpark\b/g, 'park');
  }

  private findFuzzyMatch(target: string, locations: CoordinateMap): [number, number] | null {
    const threshold = 0.8;
    
    for (const [locationName, coordinates] of Object.entries(locations)) {
      const similarity = this.calculateStringSimilarity(target, locationName);
      if (similarity >= threshold) {
        return coordinates;
      }
    }

    return null;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  generateGeoTransformCode(strategy: GeoStrategy, coordinateMap?: CoordinateMap): string {
    switch (strategy.type) {
      case 'coordinates':
        return `
        // Direct coordinate mapping
        const longitude = item.${strategy.lonField};
        const latitude = item.${strategy.latField};
        
        if (longitude == null || latitude == null) {
          console.warn('Missing coordinates for item:', item);
          return null;
        }
        
        return [parseFloat(longitude), parseFloat(latitude)];`;

      case 'address':
        return `
        // Address geocoding (requires implementation)
        const address = item.${strategy.addressField};
        
        if (!address) {
          console.warn('Missing address for item:', item);
          return null;
        }
        
        // TODO: Implement geocoding service integration
        // For now, return null and handle manually
        console.warn('Address geocoding not implemented:', address);
        return null;`;

      case 'location-name':
        const mapString = coordinateMap ? JSON.stringify(coordinateMap, null, 2) : '{}';
        return `
        // Location name mapping
        const locationMap = ${mapString};
        
        const locationName = item.${strategy.locationField};
        if (!locationName) {
          console.warn('Missing location name for item:', item);
          return null;
        }
        
        const coordinates = locationMap[locationName] || locationMap[locationName.toLowerCase()];
        if (!coordinates) {
          console.warn('Unknown location:', locationName);
          return null;
        }
        
        return coordinates;`;

      default:
        return `
        // No geographic data detected
        console.warn('No geographic coordinates available for item:', item);
        return null;`;
    }
  }
} 