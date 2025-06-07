import { FieldMetadata } from '../types.js';

export type SemanticType = 
  | 'temperature' 
  | 'date' 
  | 'location' 
  | 'quality' 
  | 'quantity' 
  | 'status'
  | 'identifier'
  | 'description'
  | 'generic';

export class FieldAnalysisService {
  analyzeFields(sampleData: any[]): FieldMetadata[] {
    if (!sampleData || sampleData.length === 0) {
      return [];
    }

    return Object.keys(sampleData[0]).map(fieldName => {
      const values = sampleData.map(row => row[fieldName]).filter(v => v != null);
      
      return {
        name: fieldName,
        type: this.detectDataType(values),
        semanticType: this.detectSemanticType(fieldName, values),
        format: this.detectFormat(values),
        nullable: this.checkNullable(sampleData.map(row => row[fieldName])),
        sampleValues: values.slice(0, 5) // Keep first 5 non-null values as samples
      };
    });
  }

  private detectDataType(values: any[]): 'string' | 'number' | 'boolean' | 'date' | 'mixed' {
    if (values.length === 0) return 'string';

    const types = new Set(values.map(v => typeof v));
    
    // Check for dates first (strings that look like dates)
    if (types.has('string') && this.isDateLike(values)) {
      return 'date';
    }

    // Single type
    if (types.size === 1) {
      const type = Array.from(types)[0];
      return type === 'object' ? 'string' : type as any;
    }

    // Mixed types - check if numbers can be parsed from strings
    if (types.has('string') && types.has('number')) {
      const stringValues = values.filter(v => typeof v === 'string');
      const parsableNumbers = stringValues.filter(v => !isNaN(Number(v)));
      
      if (parsableNumbers.length === stringValues.length) {
        return 'number';
      }
    }

    return 'mixed';
  }

  private detectSemanticType(fieldName: string, values: any[]): string {
    const lowerName = fieldName.toLowerCase();
    
    // Temperature patterns
    if (/temp|temperature|celsius|fahrenheit|°c|°f/i.test(fieldName)) {
      return 'temperature';
    }
    
    // Date/time patterns
    if (/date|time|timestamp|created|updated|modified|when/i.test(fieldName)) {
      return 'date';
    }
    
    // Location patterns
    if (/lat|lng|longitude|latitude|address|location|place|where|coord|x|y/i.test(fieldName)) {
      return 'location';
    }
    
    // Quality indicators
    if (/quality|clarity|condition|status|state|level|grade|rating/i.test(fieldName)) {
      return 'quality';
    }
    
    // Quantity patterns
    if (/count|number|amount|speed|distance|size|length|width|height|volume|weight|quantity/i.test(fieldName)) {
      return 'quantity';
    }

    // Status patterns
    if (/status|state|active|enabled|disabled|open|closed|available|operational/i.test(fieldName)) {
      return 'status';
    }

    // Identifier patterns
    if (/id|identifier|key|code|ref|reference|uuid|guid/i.test(fieldName)) {
      return 'identifier';
    }

    // Description patterns
    if (/desc|description|comment|note|detail|info|summary|text/i.test(fieldName)) {
      return 'description';
    }

    // Beach-specific patterns
    if (/beach|water|wave|swim|lifeguard|flag/i.test(fieldName)) {
      return 'beach-indicator';
    }

    // TTC-specific patterns
    if (/route|direction|vehicle|bus|streetcar|subway|stop|station/i.test(fieldName)) {
      return 'transit-indicator';
    }

    // Check actual values for additional context if available
    if (values && values.length > 0) {
      const sampleValue = values[0];
      
      // Check for coordinate-like values
      if (typeof sampleValue === 'number' && Math.abs(sampleValue) < 180) {
        if (lowerName.includes('lat') || lowerName.includes('y')) {
          return 'latitude';
        }
        if (lowerName.includes('lon') || lowerName.includes('lng') || lowerName.includes('x')) {
          return 'longitude';
        }
      }
      
      // Check for boolean-like values
      if (typeof sampleValue === 'boolean' || 
          (typeof sampleValue === 'string' && /^(true|false|yes|no|on|off)$/i.test(sampleValue))) {
        return 'boolean-indicator';
      }
    }

    return 'generic';
  }

  private detectFormat(values: any[]): string {
    if (values.length === 0) return 'unknown';

    const firstValue = values[0];
    
    // Date formats
    if (this.isDateLike(values)) {
      const dateStr = String(firstValue);
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateStr)) {
        return 'iso-datetime';
      }
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return 'iso-date';
      }
      if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
        return 'mm/dd/yyyy';
      }
      return 'date-string';
    }

    // Number formats
    if (typeof firstValue === 'number') {
      const hasDecimals = values.some(v => v % 1 !== 0);
      return hasDecimals ? 'decimal' : 'integer';
    }

    // String formats
    if (typeof firstValue === 'string') {
      // Email
      if (values.some(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) {
        return 'email';
      }
      
      // URL
      if (values.some(v => /^https?:\/\//.test(v))) {
        return 'url';
      }
      
      // Phone
      if (values.some(v => /^\+?[\d\s\-\(\)]+$/.test(v) && v.length >= 10)) {
        return 'phone';
      }
      
      // Coordinates
      if (values.some(v => /^-?\d+\.\d+$/.test(v))) {
        return 'coordinate';
      }
      
      return 'text';
    }

    return 'unknown';
  }

  private checkNullable(values: any[]): boolean {
    return values.some(v => v == null || v === '' || v === 'null' || v === 'undefined');
  }

  private isDateLike(values: any[]): boolean {
    if (values.length === 0) return false;
    
    // Check if at least 80% of values can be parsed as dates
    const dateValues = values.filter(v => {
      if (typeof v !== 'string') return false;
      const date = new Date(v);
      return !isNaN(date.getTime()) && v.length > 8; // Reasonable date string length
    });
    
    return dateValues.length / values.length >= 0.8;
  }

  /**
   * Calculate range for numeric fields
   */
  calculateRange(values: any[]): { min?: number; max?: number; avg?: number } {
    const numericValues = values
      .map(v => typeof v === 'number' ? v : Number(v))
      .filter(v => !isNaN(v));
    
    if (numericValues.length === 0) {
      return {};
    }

    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const avg = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;

    return { min, max, avg };
  }

  /**
   * Detect units from field names and values
   */
  detectUnits(fieldName: string, values: any[]): string | undefined {
    const lowerName = fieldName.toLowerCase();
    
    // Temperature units
    if (/temp|temperature/.test(lowerName)) {
      if (/celsius|°c/.test(lowerName)) return '°C';
      if (/fahrenheit|°f/.test(lowerName)) return '°F';
      return '°C'; // Default for Toronto data
    }
    
    // Distance units
    if (/distance|length|width|height/.test(lowerName)) {
      if (/km|kilometer/.test(lowerName)) return 'km';
      if (/mile/.test(lowerName)) return 'mi';
      return 'm'; // Default metric
    }
    
    // Speed units
    if (/speed|velocity/.test(lowerName)) {
      return 'km/h';
    }
    
    // Weight units
    if (/weight|mass/.test(lowerName)) {
      return 'kg';
    }
    
    // Percentage
    if (/percent|pct|%/.test(lowerName) || 
        (typeof values[0] === 'number' && values.every(v => v >= 0 && v <= 100))) {
      return '%';
    }
    
    return undefined;
  }

  /**
   * Analyze field relationships to detect coordinate pairs
   */
  detectCoordinatePairs(fields: FieldMetadata[]): Array<{ lat: string; lon: string }> {
    const pairs: Array<{ lat: string; lon: string }> = [];
    
    for (const field of fields) {
      if (field.semanticType === 'location') {
        const name = field.name.toLowerCase();
        
        // Look for latitude field
        if (/lat|latitude|y/.test(name)) {
          // Find corresponding longitude field
          const lonField = fields.find(f => {
            const lonName = f.name.toLowerCase();
            return /lon|lng|longitude|x/.test(lonName) && 
                   f.semanticType === 'location' &&
                   f.name !== field.name;
          });
          
          if (lonField) {
            pairs.push({ lat: field.name, lon: lonField.name });
          }
        }
      }
    }
    
    return pairs;
  }

  /**
   * Suggest field improvements for better data quality
   */
  suggestImprovements(fields: FieldMetadata[]): Array<{ field: string; suggestion: string }> {
    const suggestions: Array<{ field: string; suggestion: string }> = [];
    
    for (const field of fields) {
      // Suggest better naming for unclear fields
      if (field.semanticType === 'generic' && field.name.length < 3) {
        suggestions.push({
          field: field.name,
          suggestion: 'Consider using a more descriptive field name'
        });
      }
      
      // Suggest units for numeric fields without clear units
      if (field.type === 'number' && !this.detectUnits(field.name, [])) {
        suggestions.push({
          field: field.name,
          suggestion: 'Consider adding units to field name or documentation'
        });
      }
      
      // Suggest handling for high null rates
      if (field.nullable && field.sampleValues && field.sampleValues.length < 3) {
        suggestions.push({
          field: field.name,
          suggestion: 'High null rate detected - consider data quality improvements'
        });
      }
    }
    
    return suggestions;
  }
} 