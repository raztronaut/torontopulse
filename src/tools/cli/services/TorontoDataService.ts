import { DatasetMetadata, FieldMetadata, TorontoPatterns, BeachPattern, TTCPattern, NeighborhoodPattern, InfrastructurePattern, EventPattern } from '../types.js';

export class TorontoDataService {
  recognizeTorontoPatterns(metadata: DatasetMetadata): TorontoPatterns {
    return {
      beaches: this.detectBeachData(metadata),
      ttc: this.detectTTCData(metadata),
      neighborhoods: this.detectNeighborhoodData(metadata),
      infrastructure: this.detectInfrastructureData(metadata),
      events: this.detectEventData(metadata)
    };
  }

  private detectBeachData(metadata: DatasetMetadata): BeachPattern | null {
    const beachIndicators = ['beach', 'water', 'temperature', 'clarity', 'wave', 'turbidity', 'swim'];
    const hasBeachFields = metadata.valueFields.some(field => 
      beachIndicators.some(indicator => 
        field.name.toLowerCase().includes(indicator)
      )
    );

    // Check if dataset name or description mentions beaches
    const nameHasBeach = /beach|swimming|water quality/i.test(metadata.name + ' ' + metadata.description);

    if (hasBeachFields || nameHasBeach) {
      return {
        type: 'beach-observations',
        temperatureFields: this.findTemperatureFields(metadata),
        qualityFields: this.findQualityFields(metadata),
        locationField: this.findLocationField(metadata)
      };
    }

    return null;
  }

  private detectTTCData(metadata: DatasetMetadata): TTCPattern | null {
    const ttcIndicators = ['ttc', 'transit', 'bus', 'streetcar', 'subway', 'route', 'vehicle', 'direction'];
    const hasTTCFields = metadata.valueFields.some(field => 
      ttcIndicators.some(indicator => 
        field.name.toLowerCase().includes(indicator)
      )
    );

    const nameHasTTC = /ttc|transit|bus|streetcar|subway/i.test(metadata.name + ' ' + metadata.description);

    if (hasTTCFields || nameHasTTC) {
      const routeField = this.findFieldByPattern(metadata, /route|line/i);
      const directionField = this.findFieldByPattern(metadata, /direction|dir/i);
      const vehicleIdField = this.findFieldByPattern(metadata, /vehicle|id|unit/i);
      const coordinateFields = this.findCoordinateFields(metadata);

      if (routeField && coordinateFields.length >= 2) {
        return {
          type: 'transit-vehicles',
          routeField: routeField.name,
          directionField: directionField?.name || '',
          vehicleIdField: vehicleIdField?.name || '',
          coordinateFields: [coordinateFields[0].name, coordinateFields[1].name] as [string, string]
        };
      }
    }

    return null;
  }

  private detectNeighborhoodData(metadata: DatasetMetadata): NeighborhoodPattern | null {
    const neighborhoodIndicators = ['neighborhood', 'neighbourhood', 'ward', 'district', 'area', 'community'];
    const hasNeighborhoodFields = metadata.valueFields.some(field => 
      neighborhoodIndicators.some(indicator => 
        field.name.toLowerCase().includes(indicator)
      )
    );

    const nameHasNeighborhood = /neighborhood|neighbourhood|ward|district/i.test(metadata.name + ' ' + metadata.description);

    if (hasNeighborhoodFields || nameHasNeighborhood) {
      const nameField = this.findFieldByPattern(metadata, /name|neighborhood|neighbourhood|ward/i);
      const boundaryField = this.findFieldByPattern(metadata, /boundary|polygon|geometry/i);

      if (nameField) {
        return {
          type: 'neighborhood-data',
          nameField: nameField.name,
          boundaryField: boundaryField?.name
        };
      }
    }

    return null;
  }

  private detectInfrastructureData(metadata: DatasetMetadata): InfrastructurePattern | null {
    const infrastructureIndicators = ['infrastructure', 'facility', 'building', 'park', 'road', 'bridge', 'construction'];
    const hasInfrastructureFields = metadata.valueFields.some(field => 
      infrastructureIndicators.some(indicator => 
        field.name.toLowerCase().includes(indicator)
      )
    );

    const nameHasInfrastructure = /infrastructure|facility|building|park|road|bridge|construction/i.test(metadata.name + ' ' + metadata.description);

    if (hasInfrastructureFields || nameHasInfrastructure) {
      const statusField = this.findFieldByPattern(metadata, /status|condition|state/i);
      const locationField = this.findLocationField(metadata);
      const typeField = this.findFieldByPattern(metadata, /type|category|kind/i);

      if (statusField && locationField) {
        return {
          type: 'infrastructure-data',
          statusField: statusField.name,
          locationField: locationField,
          typeField: typeField?.name || ''
        };
      }
    }

    return null;
  }

  private detectEventData(metadata: DatasetMetadata): EventPattern | null {
    const eventIndicators = ['event', 'festival', 'concert', 'meeting', 'activity', 'program'];
    const hasEventFields = metadata.valueFields.some(field => 
      eventIndicators.some(indicator => 
        field.name.toLowerCase().includes(indicator)
      )
    );

    const nameHasEvent = /event|festival|concert|meeting|activity|program/i.test(metadata.name + ' ' + metadata.description);

    if (hasEventFields || nameHasEvent) {
      const startDateField = this.findFieldByPattern(metadata, /start|begin|date/i);
      const endDateField = this.findFieldByPattern(metadata, /end|finish|until/i);
      const locationField = this.findLocationField(metadata);
      const categoryField = this.findFieldByPattern(metadata, /category|type|kind/i);

      if (startDateField && locationField && categoryField) {
        return {
          type: 'event-data',
          startDateField: startDateField.name,
          endDateField: endDateField?.name,
          locationField: locationField,
          categoryField: categoryField.name
        };
      }
    }

    return null;
  }

  private findTemperatureFields(metadata: DatasetMetadata): string[] {
    return metadata.valueFields
      .filter(field => field.semanticType === 'temperature' || /temp|temperature/i.test(field.name))
      .map(field => field.name);
  }

  private findQualityFields(metadata: DatasetMetadata): string[] {
    return metadata.valueFields
      .filter(field => 
        field.semanticType === 'quality' || 
        /quality|clarity|condition|turbidity|clear/i.test(field.name)
      )
      .map(field => field.name);
  }

  private findLocationField(metadata: DatasetMetadata): string {
    // Look for location name fields first
    const locationNameField = metadata.valueFields.find(field => 
      /location|place|name|site|beach|park|station/i.test(field.name) &&
      field.semanticType !== 'location' // Not coordinate fields
    );

    if (locationNameField) {
      return locationNameField.name;
    }

    // Fall back to address fields
    const addressField = metadata.valueFields.find(field => 
      /address|addr/i.test(field.name)
    );

    return addressField?.name || '';
  }

  private findFieldByPattern(metadata: DatasetMetadata, pattern: RegExp): FieldMetadata | null {
    return metadata.valueFields.find(field => pattern.test(field.name)) || null;
  }

  private findCoordinateFields(metadata: DatasetMetadata): FieldMetadata[] {
    return metadata.valueFields.filter(field => 
      field.semanticType === 'location' && 
      /lat|lng|longitude|latitude|x|y|coord/i.test(field.name)
    );
  }

  /**
   * Get Toronto-specific data enhancement suggestions
   */
  getTorontoEnhancements(patterns: TorontoPatterns): Array<{ type: string; suggestion: string; implementation: string }> {
    const enhancements: Array<{ type: string; suggestion: string; implementation: string }> = [];

    if (patterns.beaches) {
      enhancements.push({
        type: 'Beach Data',
        suggestion: 'Add swimming advisories based on water quality',
        implementation: 'Create conditional styling for water quality thresholds'
      });

      enhancements.push({
        type: 'Beach Data',
        suggestion: 'Include weather correlation for better context',
        implementation: 'Add weather API integration for temperature context'
      });
    }

    if (patterns.ttc) {
      enhancements.push({
        type: 'TTC Data',
        suggestion: 'Add real-time delay predictions',
        implementation: 'Implement color coding for delay severity levels'
      });

      enhancements.push({
        type: 'TTC Data',
        suggestion: 'Show route connections and transfers',
        implementation: 'Add route network visualization layer'
      });
    }

    if (patterns.neighborhoods) {
      enhancements.push({
        type: 'Neighborhood Data',
        suggestion: 'Add demographic context and statistics',
        implementation: 'Integrate census data for population insights'
      });
    }

    if (patterns.infrastructure) {
      enhancements.push({
        type: 'Infrastructure Data',
        suggestion: 'Add maintenance scheduling and history',
        implementation: 'Create timeline visualization for infrastructure status'
      });
    }

    if (patterns.events) {
      enhancements.push({
        type: 'Event Data',
        suggestion: 'Add calendar integration and reminders',
        implementation: 'Implement date-based filtering and upcoming events highlight'
      });
    }

    return enhancements;
  }

  /**
   * Generate Toronto-specific layer configurations
   */
  generateTorontoLayerConfig(patterns: TorontoPatterns): Record<string, any> {
    const config: Record<string, any> = {};

    if (patterns.beaches) {
      config.beaches = {
        icon: '🏖️',
        color: '#00CED1',
        clustering: false,
        heatmap: false,
        popup: 'beach-observations',
        legend: true,
        filters: ['waterTemp', 'turbidity', 'waveAction']
      };
    }

    if (patterns.ttc) {
      config.ttc = {
        icon: '🚌',
        color: '#FF0000',
        clustering: true,
        heatmap: false,
        popup: 'ttc-vehicles',
        legend: true,
        filters: ['route', 'direction', 'delay'],
        realtime: true
      };
    }

    if (patterns.neighborhoods) {
      config.neighborhoods = {
        icon: '🏘️',
        color: '#4CAF50',
        clustering: false,
        heatmap: false,
        popup: 'neighborhood-data',
        legend: false,
        filters: ['name', 'type']
      };
    }

    if (patterns.infrastructure) {
      config.infrastructure = {
        icon: '🏗️',
        color: '#FF9800',
        clustering: true,
        heatmap: false,
        popup: 'infrastructure-data',
        legend: true,
        filters: ['status', 'type']
      };
    }

    if (patterns.events) {
      config.events = {
        icon: '🎉',
        color: '#9C27B0',
        clustering: true,
        heatmap: false,
        popup: 'event-data',
        legend: false,
        filters: ['category', 'startDate'],
        temporal: true
      };
    }

    return config;
  }

  /**
   * Get Toronto-specific data validation rules
   */
  getTorontoValidationRules(patterns: TorontoPatterns): Array<{ field: string; rule: string; message: string }> {
    const rules: Array<{ field: string; rule: string; message: string }> = [];

    if (patterns.beaches) {
      rules.push({
        field: patterns.beaches.temperatureFields[0] || 'waterTemp',
        rule: 'range(0, 35)',
        message: 'Water temperature should be between 0°C and 35°C for Toronto beaches'
      });

      rules.push({
        field: patterns.beaches.qualityFields[0] || 'turbidity',
        rule: 'enum(1,2,3,4,5)',
        message: 'Water quality should be rated 1-5 (1=Poor, 5=Excellent)'
      });
    }

    if (patterns.ttc) {
      rules.push({
        field: patterns.ttc.routeField,
        rule: 'ttc_route',
        message: 'Route should be a valid TTC route number or name'
      });

      rules.push({
        field: patterns.ttc.coordinateFields[0],
        rule: 'toronto_bounds_lat',
        message: 'Latitude should be within Toronto boundaries (43.5-43.9)'
      });

      rules.push({
        field: patterns.ttc.coordinateFields[1],
        rule: 'toronto_bounds_lng',
        message: 'Longitude should be within Toronto boundaries (-79.8 to -79.1)'
      });
    }

    return rules;
  }

  /**
   * Get recommended refresh intervals for Toronto data types
   */
  getRecommendedRefreshInterval(patterns: TorontoPatterns): number {
    // Return the most frequent update needed
    let minInterval = 24 * 60 * 60 * 1000; // 24 hours default

    if (patterns.ttc) {
      minInterval = Math.min(minInterval, 30 * 1000); // 30 seconds for TTC
    }

    if (patterns.beaches) {
      minInterval = Math.min(minInterval, 60 * 60 * 1000); // 1 hour for beaches
    }

    if (patterns.infrastructure) {
      minInterval = Math.min(minInterval, 6 * 60 * 60 * 1000); // 6 hours for infrastructure
    }

    if (patterns.events) {
      minInterval = Math.min(minInterval, 12 * 60 * 60 * 1000); // 12 hours for events
    }

    if (patterns.neighborhoods) {
      minInterval = Math.min(minInterval, 7 * 24 * 60 * 60 * 1000); // 1 week for neighborhoods
    }

    return minInterval;
  }

  /**
   * Generate Toronto-specific data transformations
   */
  generateTorontoTransformations(patterns: TorontoPatterns): Record<string, string> {
    const transformations: Record<string, string> = {};

    if (patterns.beaches) {
      transformations.beachQuality = `
        // Transform numeric quality to descriptive text
        const qualityMap = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };
        feature.properties.qualityText = qualityMap[feature.properties.${patterns.beaches.qualityFields[0]}] || 'Unknown';
      `;

      transformations.swimmingAdvisory = `
        // Generate swimming advisory based on conditions
        const temp = feature.properties.${patterns.beaches.temperatureFields[0]};
        const quality = feature.properties.${patterns.beaches.qualityFields[0]};
        
        if (quality <= 2) {
          feature.properties.advisory = 'Not Recommended';
        } else if (temp < 15) {
          feature.properties.advisory = 'Cold Water';
        } else if (temp >= 20 && quality >= 4) {
          feature.properties.advisory = 'Excellent';
        } else {
          feature.properties.advisory = 'Good';
        }
      `;
    }

    if (patterns.ttc) {
      transformations.delayStatus = `
        // Categorize delays
        const delay = feature.properties.delay || 0;
        if (delay <= 2) {
          feature.properties.delayStatus = 'On Time';
        } else if (delay <= 5) {
          feature.properties.delayStatus = 'Minor Delay';
        } else if (delay <= 15) {
          feature.properties.delayStatus = 'Moderate Delay';
        } else {
          feature.properties.delayStatus = 'Major Delay';
        }
      `;
    }

    return transformations;
  }
} 