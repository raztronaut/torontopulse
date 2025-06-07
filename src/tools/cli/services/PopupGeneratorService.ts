import { FieldMetadata, PopupTemplate, PopupField, PopupStyling, ColorScheme } from '../types.js';
import { ColorCodingService } from './ColorCodingService.js';

export class PopupGeneratorService {
  private colorService = new ColorCodingService();

  generatePopupTemplate(metadata: { name: string; valueFields: FieldMetadata[] }): PopupTemplate {
    const layout = this.determineLayout(metadata.valueFields);
    const fields = this.generatePopupFields(metadata.valueFields);
    const styling = this.generateStyling(metadata.valueFields, layout);

    return {
      id: `popup-${metadata.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: `${metadata.name} Popup`,
      layout,
      fields,
      styling
    };
  }

  private determineLayout(fields: FieldMetadata[]): 'grid' | 'list' | 'card' {
    const fieldCount = fields.length;
    const hasImages = fields.some(f => f.semanticType === 'url' && /image|photo|pic/.test(f.name));
    const hasLongText = fields.some(f => f.semanticType === 'description');

    if (hasImages || hasLongText) {
      return 'card';
    } else if (fieldCount <= 4) {
      return 'grid';
    } else {
      return 'list';
    }
  }

  private generatePopupFields(fields: FieldMetadata[]): PopupField[] {
    return fields
      .filter(field => this.shouldIncludeInPopup(field))
      .sort((a, b) => this.getFieldPriority(a) - this.getFieldPriority(b))
      .map(field => this.createPopupField(field));
  }

  private shouldIncludeInPopup(field: FieldMetadata): boolean {
    // Exclude technical fields
    if (field.semanticType === 'identifier' && field.name.toLowerCase().includes('id')) {
      return false;
    }

    // Exclude coordinate fields (they're used for positioning)
    if (field.semanticType === 'location' && /lat|lng|longitude|latitude|x|y/.test(field.name.toLowerCase())) {
      return false;
    }

    return true;
  }

  private getFieldPriority(field: FieldMetadata): number {
    // Priority order for popup display
    switch (field.semanticType) {
      case 'temperature': return 1;
      case 'quality': return 2;
      case 'status': return 3;
      case 'quantity': return 4;
      case 'date': return 5;
      case 'description': return 8;
      case 'identifier': return 9;
      default: return 6;
    }
  }

  private createPopupField(field: FieldMetadata): PopupField {
    const label = this.formatFieldLabel(field.name);
    const type = this.mapToPopupFieldType(field);
    const format = this.determineFormat(field);
    const unit = this.determineUnit(field);
    const colorCoding = this.shouldUseColorCoding(field);

    return {
      key: field.name,
      label,
      type,
      format,
      unit,
      colorCoding
    };
  }

  private formatFieldLabel(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  private mapToPopupFieldType(field: FieldMetadata): PopupField['type'] {
    switch (field.semanticType) {
      case 'temperature':
        return 'temperature';
      case 'quality':
        return 'quality';
      case 'date':
        return 'date';
      case 'location':
        return 'text';
      default:
        if (field.type === 'number') return 'number';
        if (field.format === 'url') return 'url';
        if (field.format === 'email') return 'email';
        return 'text';
    }
  }

  private determineFormat(field: FieldMetadata): string | undefined {
    switch (field.semanticType) {
      case 'temperature':
        return '0.1'; // One decimal place
      case 'date':
        if (field.format === 'iso-datetime') return 'MMM dd, yyyy HH:mm';
        if (field.format === 'iso-date') return 'MMM dd, yyyy';
        return 'relative'; // "2 hours ago"
      case 'quantity':
        if (field.type === 'number') return '0.0';
        break;
    }
    return undefined;
  }

  private determineUnit(field: FieldMetadata): string | undefined {
    const lowerName = field.name.toLowerCase();
    
    if (field.semanticType === 'temperature') {
      return '°C'; // Default for Toronto
    }
    
    if (/speed/.test(lowerName)) return 'km/h';
    if (/distance|length/.test(lowerName)) return 'm';
    if (/weight/.test(lowerName)) return 'kg';
    if (/percent|%/.test(lowerName)) return '%';
    
    return undefined;
  }

  private shouldUseColorCoding(field: FieldMetadata): boolean {
    return ['temperature', 'quality', 'status', 'beach-indicator', 'transit-indicator'].includes(field.semanticType);
  }

  private generateStyling(fields: FieldMetadata[], layout: 'grid' | 'list' | 'card'): PopupStyling {
    const hasColorCoding = fields.some(f => this.shouldUseColorCoding(f));
    const hasUnits = fields.some(f => this.determineUnit(f) !== undefined);
    const hasDateFields = fields.some(f => f.semanticType === 'date');

    return {
      columns: layout === 'grid' ? Math.min(2, Math.ceil(fields.length / 3)) : undefined,
      spacing: layout === 'card' ? 'spacious' : 'normal',
      colorCoding: hasColorCoding,
      units: hasUnits,
      dateFormatting: hasDateFields ? 'relative' : 'absolute',
      responsive: true
    };
  }

  /**
   * Generate HTML template string for the popup
   */
  generateHTMLTemplate(template: PopupTemplate): string {
    const { layout, fields, styling } = template;
    
    let html = `<div class="popup-container popup-${layout}">`;
    
    if (layout === 'grid') {
      html += this.generateGridLayout(fields, styling);
    } else if (layout === 'card') {
      html += this.generateCardLayout(fields, styling);
    } else {
      html += this.generateListLayout(fields, styling);
    }
    
    html += '</div>';
    
    return html;
  }

  private generateGridLayout(fields: PopupField[], styling: PopupStyling): string {
    const columns = styling.columns || 2;
    let html = `<div class="popup-grid" style="grid-template-columns: repeat(${columns}, 1fr);">`;
    
    fields.forEach(field => {
      html += `<div class="popup-field">`;
      html += `<label class="popup-label">${field.label}</label>`;
      html += this.generateFieldValue(field, styling);
      html += `</div>`;
    });
    
    html += '</div>';
    return html;
  }

  private generateCardLayout(fields: PopupField[], styling: PopupStyling): string {
    let html = '<div class="popup-card">';
    
    // Header with primary fields
    const primaryFields = fields.filter(f => ['temperature', 'quality', 'status'].includes(f.type));
    if (primaryFields.length > 0) {
      html += '<div class="popup-header">';
      primaryFields.forEach(field => {
        html += this.generateFieldValue(field, styling, true);
      });
      html += '</div>';
    }
    
    // Body with remaining fields
    const remainingFields = fields.filter(f => !primaryFields.includes(f));
    if (remainingFields.length > 0) {
      html += '<div class="popup-body">';
      remainingFields.forEach(field => {
        html += `<div class="popup-field">`;
        html += `<span class="popup-label">${field.label}:</span> `;
        html += this.generateFieldValue(field, styling);
        html += `</div>`;
      });
      html += '</div>';
    }
    
    html += '</div>';
    return html;
  }

  private generateListLayout(fields: PopupField[], styling: PopupStyling): string {
    let html = '<div class="popup-list">';
    
    fields.forEach(field => {
      html += `<div class="popup-field">`;
      html += `<span class="popup-label">${field.label}:</span> `;
      html += this.generateFieldValue(field, styling);
      html += `</div>`;
    });
    
    html += '</div>';
    return html;
  }

  private generateFieldValue(field: PopupField, styling: PopupStyling, isHeader = false): string {
    const className = `popup-value ${field.type}${isHeader ? ' header-value' : ''}`;
    let valueExpression = `{${field.key}}`;
    
    // Add formatting
    if (field.format) {
      if (field.type === 'date') {
        valueExpression = `{${field.key}:date:${field.format}}`;
      } else if (field.type === 'number' || field.type === 'temperature') {
        valueExpression = `{${field.key}:number:${field.format}}`;
      }
    }
    
    // Add units
    if (field.unit) {
      valueExpression += ` ${field.unit}`;
    }
    
    // Add color coding class if enabled
    let colorClass = '';
    if (field.colorCoding && styling.colorCoding) {
      colorClass = ` color-coded field-${field.key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    }
    
    return `<span class="${className}${colorClass}">${valueExpression}</span>`;
  }

  /**
   * Generate CSS styles for the popup template
   */
  generateCSS(template: PopupTemplate): string {
    const { layout, styling } = template;
    
    let css = `/* Auto-generated popup styles for ${template.name} */\n`;
    css += `.popup-container.popup-${layout} {\n`;
    css += `  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n`;
    css += `  font-size: 14px;\n`;
    css += `  line-height: 1.4;\n`;
    css += `  color: #333;\n`;
    css += `  max-width: 300px;\n`;
    css += `  padding: ${styling.spacing === 'compact' ? '8px' : styling.spacing === 'spacious' ? '16px' : '12px'};\n`;
    css += `}\n\n`;
    
    if (layout === 'grid') {
      css += this.generateGridCSS(styling);
    } else if (layout === 'card') {
      css += this.generateCardCSS(styling);
    } else {
      css += this.generateListCSS(styling);
    }
    
    css += this.generateCommonCSS(styling);
    
    return css;
  }

  private generateGridCSS(styling: PopupStyling): string {
    return `.popup-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(${styling.columns || 2}, 1fr);
}

.popup-field {
  display: flex;
  flex-direction: column;
}

.popup-label {
  font-weight: 600;
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

`;
  }

  private generateCardCSS(styling: PopupStyling): string {
    return `.popup-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.popup-header {
  background: #f8f9fa;
  padding: 12px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  gap: 12px;
  align-items: center;
}

.popup-body {
  padding: 12px;
}

.popup-field {
  margin-bottom: 8px;
}

.popup-field:last-child {
  margin-bottom: 0;
}

.header-value {
  font-size: 16px;
  font-weight: 600;
}

`;
  }

  private generateListCSS(styling: PopupStyling): string {
    return `.popup-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.popup-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
}

.popup-field:last-child {
  border-bottom: none;
}

.popup-label {
  font-weight: 500;
  color: #666;
  flex: 1;
}

`;
  }

  private generateCommonCSS(styling: PopupStyling): string {
    let css = `.popup-value {
  font-weight: 500;
}

.popup-value.temperature {
  font-weight: 600;
}

.popup-value.quality {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
}

.popup-value.date {
  color: #666;
  font-size: 13px;
}

.popup-value.url {
  color: #007bff;
  text-decoration: underline;
}

`;

    if (styling.responsive) {
      css += `
@media (max-width: 480px) {
  .popup-container {
    max-width: 250px;
    font-size: 13px;
  }
  
  .popup-grid {
    grid-template-columns: 1fr;
  }
  
  .popup-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

`;
    }

    return css;
  }

  /**
   * Generate Toronto-specific popup templates
   */
  generateTorontoSpecificTemplate(dataType: string, fields: FieldMetadata[]): PopupTemplate {
    switch (dataType) {
      case 'beach-observations':
        return this.generateBeachTemplate(fields);
      case 'ttc-vehicles':
        return this.generateTTCTemplate(fields);
      case 'road-conditions':
        return this.generateRoadTemplate(fields);
      default:
        return this.generatePopupTemplate({ name: dataType, valueFields: fields });
    }
  }

  private generateBeachTemplate(fields: FieldMetadata[]): PopupTemplate {
    return {
      id: 'beach-observations-popup',
      name: 'Beach Observations',
      layout: 'card',
      fields: [
        { key: 'beachName', label: 'Beach', type: 'text', colorCoding: false },
        { key: 'waterTemp', label: 'Water Temperature', type: 'temperature', format: '0.1', unit: '°C', colorCoding: true },
        { key: 'turbidity', label: 'Water Clarity', type: 'quality', colorCoding: true },
        { key: 'waveAction', label: 'Wave Conditions', type: 'text', colorCoding: false },
        { key: 'observationDate', label: 'Last Updated', type: 'date', format: 'relative', colorCoding: false }
      ],
      styling: {
        spacing: 'normal',
        colorCoding: true,
        units: true,
        dateFormatting: 'relative',
        responsive: true
      }
    };
  }

  private generateTTCTemplate(fields: FieldMetadata[]): PopupTemplate {
    return {
      id: 'ttc-vehicles-popup',
      name: 'TTC Vehicle',
      layout: 'list',
      fields: [
        { key: 'route', label: 'Route', type: 'text', colorCoding: false },
        { key: 'direction', label: 'Direction', type: 'text', colorCoding: false },
        { key: 'vehicleId', label: 'Vehicle', type: 'text', colorCoding: false },
        { key: 'delay', label: 'Delay', type: 'number', format: '0', unit: 'min', colorCoding: true },
        { key: 'lastUpdate', label: 'Last Update', type: 'date', format: 'relative', colorCoding: false }
      ],
      styling: {
        spacing: 'compact',
        colorCoding: true,
        units: true,
        dateFormatting: 'relative',
        responsive: true
      }
    };
  }

  private generateRoadTemplate(fields: FieldMetadata[]): PopupTemplate {
    return {
      id: 'road-conditions-popup',
      name: 'Road Conditions',
      layout: 'card',
      fields: [
        { key: 'roadName', label: 'Road', type: 'text', colorCoding: false },
        { key: 'status', label: 'Status', type: 'text', colorCoding: true },
        { key: 'description', label: 'Details', type: 'text', colorCoding: false },
        { key: 'startDate', label: 'Start Date', type: 'date', format: 'MMM dd, yyyy', colorCoding: false },
        { key: 'endDate', label: 'Expected End', type: 'date', format: 'MMM dd, yyyy', colorCoding: false }
      ],
      styling: {
        spacing: 'normal',
        colorCoding: true,
        units: false,
        dateFormatting: 'absolute',
        responsive: true
      }
    };
  }
} 