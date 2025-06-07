import { ColorScheme, FieldMetadata } from '../types.js';

export class ColorCodingService {
  generateColorScheme(field: FieldMetadata): ColorScheme {
    switch (field.semanticType) {
      case 'temperature':
        return this.createTemperatureColorScheme();
      case 'quality':
        return this.createQualityColorScheme();
      case 'quantity':
        return this.createQuantityColorScheme();
      case 'status':
        return this.createStatusColorScheme();
      case 'beach-indicator':
        return this.createBeachColorScheme();
      case 'transit-indicator':
        return this.createTransitColorScheme();
      default:
        return this.createDefaultColorScheme();
    }
  }

  private createTemperatureColorScheme(): ColorScheme {
    return {
      type: 'temperature',
      colors: [
        '#0066CC', // Cold blue
        '#0099FF', // Cool blue
        '#33CCFF', // Light blue
        '#66FF66', // Green
        '#FFFF00', // Yellow
        '#FF9900', // Orange
        '#FF3300', // Red
        '#CC0000'  // Dark red
      ],
      thresholds: [0, 5, 10, 15, 20, 25, 30, 35],
      labels: ['Freezing', 'Very Cold', 'Cold', 'Cool', 'Mild', 'Warm', 'Hot', 'Very Hot']
    };
  }

  private createQualityColorScheme(): ColorScheme {
    return {
      type: 'quality',
      colors: [
        '#FF0000', // Poor - Red
        '#FF6600', // Fair - Orange
        '#FFCC00', // Good - Yellow
        '#66FF00', // Very Good - Light Green
        '#00FF00'  // Excellent - Green
      ],
      thresholds: [1, 2, 3, 4, 5],
      labels: ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent']
    };
  }

  private createQuantityColorScheme(): ColorScheme {
    return {
      type: 'quantity',
      colors: [
        '#E8F4FD', // Very light blue
        '#B3D9F7', // Light blue
        '#7FBEF1', // Medium blue
        '#4BA3EB', // Blue
        '#1788E5', // Dark blue
        '#0D6EDF'  // Very dark blue
      ],
      labels: ['Very Low', 'Low', 'Medium-Low', 'Medium', 'High', 'Very High']
    };
  }

  private createStatusColorScheme(): ColorScheme {
    return {
      type: 'status',
      colors: [
        '#FF0000', // Inactive/Closed - Red
        '#FFAA00', // Warning/Partial - Orange
        '#00FF00'  // Active/Open - Green
      ],
      labels: ['Inactive', 'Warning', 'Active']
    };
  }

  private createBeachColorScheme(): ColorScheme {
    return {
      type: 'quality',
      colors: [
        '#8B4513', // Poor water quality - Brown
        '#FF6347', // Fair - Tomato
        '#FFD700', // Good - Gold
        '#32CD32', // Very Good - Lime Green
        '#00CED1'  // Excellent - Dark Turquoise
      ],
      thresholds: [1, 2, 3, 4, 5],
      labels: ['Unsafe', 'Poor', 'Fair', 'Good', 'Excellent']
    };
  }

  private createTransitColorScheme(): ColorScheme {
    return {
      type: 'status',
      colors: [
        '#FF0000', // Delayed/Issues - Red
        '#FFA500', // Minor delays - Orange
        '#FFFF00', // On time - Yellow
        '#00FF00'  // Early/Ahead - Green
      ],
      labels: ['Delayed', 'Minor Delays', 'On Time', 'Ahead of Schedule']
    };
  }

  private createDefaultColorScheme(): ColorScheme {
    return {
      type: 'default',
      colors: [
        '#1f77b4', // Blue
        '#ff7f0e', // Orange
        '#2ca02c', // Green
        '#d62728', // Red
        '#9467bd', // Purple
        '#8c564b', // Brown
        '#e377c2', // Pink
        '#7f7f7f', // Gray
        '#bcbd22', // Olive
        '#17becf'  // Cyan
      ],
      labels: ['Category 1', 'Category 2', 'Category 3', 'Category 4', 'Category 5', 
               'Category 6', 'Category 7', 'Category 8', 'Category 9', 'Category 10']
    };
  }

  /**
   * Generate Mapbox paint configuration from color scheme
   */
  generateMapboxPaint(field: FieldMetadata, colorScheme: ColorScheme): Record<string, any> {
    const baseConfig = {
      'circle-radius': 6,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#ffffff'
    };

    if (colorScheme.thresholds && colorScheme.thresholds.length > 0) {
      // Create step expression for threshold-based coloring
      const stepExpression = ['step', ['get', field.name]];
      
      colorScheme.colors.forEach((color, index) => {
        if (index === 0) {
          stepExpression.push(color);
        } else if (index < colorScheme.thresholds!.length) {
          stepExpression.push(colorScheme.thresholds![index], color);
        }
      });

      return {
        ...baseConfig,
        'circle-color': stepExpression
      };
    } else {
      // Categorical coloring
      const caseExpression = ['case'];
      
      colorScheme.colors.forEach((color, index) => {
        if (index < colorScheme.colors.length - 1) {
          caseExpression.push(['==', ['get', field.name], index + 1], color);
        }
      });
      
      // Default color
      caseExpression.push(colorScheme.colors[0]);

      return {
        ...baseConfig,
        'circle-color': caseExpression
      };
    }
  }

  /**
   * Generate CSS classes for popup styling
   */
  generatePopupStyles(field: FieldMetadata, colorScheme: ColorScheme): string {
    const className = `field-${field.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    let css = `/* Auto-generated styles for ${field.name} */\n`;
    
    if (colorScheme.thresholds) {
      colorScheme.colors.forEach((color, index) => {
        const label = colorScheme.labels?.[index] || `level-${index}`;
        css += `.${className}.${label.toLowerCase().replace(/\s+/g, '-')} {\n`;
        css += `  background-color: ${color};\n`;
        css += `  color: ${this.getContrastColor(color)};\n`;
        css += `  padding: 2px 6px;\n`;
        css += `  border-radius: 3px;\n`;
        css += `  font-weight: 500;\n`;
        css += `}\n\n`;
      });
    }

    return css;
  }

  /**
   * Get appropriate text color for background
   */
  private getContrastColor(backgroundColor: string): string {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  /**
   * Generate legend configuration
   */
  generateLegend(field: FieldMetadata, colorScheme: ColorScheme): {
    title: string;
    items: Array<{ color: string; label: string; value?: number }>;
  } {
    const title = this.formatFieldName(field.name);
    const items = colorScheme.colors.map((color, index) => ({
      color,
      label: colorScheme.labels?.[index] || `Value ${index + 1}`,
      value: colorScheme.thresholds?.[index]
    }));

    return { title, items };
  }

  /**
   * Format field name for display
   */
  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/[_-]/g, ' ') // Replace underscores and dashes with spaces
      .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
      .trim();
  }

  /**
   * Generate color scheme for Toronto-specific data patterns
   */
  generateTorontoSpecificScheme(dataType: string): ColorScheme {
    switch (dataType) {
      case 'beach-water-quality':
        return {
          type: 'quality',
          colors: ['#8B0000', '#FF4500', '#FFD700', '#32CD32', '#00CED1'],
          thresholds: [1, 2, 3, 4, 5],
          labels: ['Unsafe', 'Poor', 'Fair', 'Good', 'Excellent']
        };
        
      case 'ttc-delay':
        return {
          type: 'quantity',
          colors: ['#00FF00', '#FFFF00', '#FFA500', '#FF0000'],
          thresholds: [0, 5, 15, 30],
          labels: ['On Time', 'Minor Delay', 'Moderate Delay', 'Major Delay']
        };
        
      case 'road-condition':
        return {
          type: 'status',
          colors: ['#FF0000', '#FFA500', '#FFFF00', '#00FF00'],
          labels: ['Closed', 'Construction', 'Reduced Lanes', 'Open']
        };
        
      case 'air-quality':
        return {
          type: 'quality',
          colors: ['#00E400', '#FFFF00', '#FF7E00', '#FF0000', '#8F3F97', '#7E0023'],
          thresholds: [0, 51, 101, 151, 201, 301],
          labels: ['Good', 'Moderate', 'Unhealthy for Sensitive', 'Unhealthy', 'Very Unhealthy', 'Hazardous']
        };
        
      default:
        return this.createDefaultColorScheme();
    }
  }
} 