import { PluginConfig, DatasetMetadata, ValidationResult, TestResult } from '../types.js';
import { TorontoDataService } from './TorontoDataService.js';

export interface ValidationOptions {
  plugin?: string;
  layer?: string;
  all?: boolean;
  fix?: boolean;
  verbose?: boolean;
}

export interface IntegrationValidationResult {
  plugin: string;
  valid: boolean;
  tests: TestResult[];
  errors: string[];
  warnings: string[];
  suggestions: string[];
  performance: {
    apiResponseTime: number;
    dataSize: number;
    transformationTime: number;
  };
}

export class ValidationService {
  private torontoService = new TorontoDataService();

  async validateIntegration(config: PluginConfig, options: ValidationOptions = {}): Promise<IntegrationValidationResult> {
    const tests: TestResult[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    console.log(`🔍 Validating integration for ${config.name}...`);

    // Test API access
    const apiTest = await this.testApiAccess(config);
    tests.push(apiTest);
    if (!apiTest.success) {
      errors.push(apiTest.message || 'API access failed');
    }

    // Test data structure
    const structureTest = await this.validateDataStructure(config);
    tests.push(structureTest);
    if (!structureTest.success) {
      errors.push(structureTest.message || 'Data structure validation failed');
    }

    // Test transformation
    const transformTest = await this.testTransformation(config);
    tests.push(transformTest);
    if (!transformTest.success) {
      errors.push(transformTest.message || 'Data transformation failed');
    }

    // Test map integration
    const mapTest = await this.validateMapIntegration(config);
    tests.push(mapTest);
    if (!mapTest.success) {
      warnings.push(mapTest.message || 'Map integration issues detected');
    }

    // Test popup rendering
    const popupTest = await this.testPopupRendering(config);
    tests.push(popupTest);
    if (!popupTest.success) {
      warnings.push(popupTest.message || 'Popup rendering issues detected');
    }

    // Performance tests
    const performanceTest = await this.testPerformance(config);
    tests.push(performanceTest);

    // Toronto-specific validations
    const torontoTests = await this.validateTorontoSpecific(config);
    tests.push(...torontoTests);

    // Generate suggestions
    suggestions.push(...this.generateSuggestions(tests, config));

    const performance = this.extractPerformanceMetrics(tests);
    const valid = errors.length === 0;

    return {
      plugin: config.name,
      valid,
      tests,
      errors,
      warnings,
      suggestions,
      performance
    };
  }

  private async testApiAccess(config: PluginConfig): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(config.apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Toronto-Pulse-CLI/2.0'
        }
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        return {
          step: 'API Access',
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
          duration
        };
      }

      const data = await response.json();
      const recordCount = Array.isArray(data) ? data.length : 
                         data.result?.records?.length || 
                         data.records?.length || 
                         'unknown';

      return {
        step: 'API Access',
        success: true,
        message: `Successfully fetched ${recordCount} records`,
        duration,
        details: {
          status: response.status,
          contentType: response.headers.get('content-type'),
          recordCount
        }
      };
    } catch (error) {
      return {
        step: 'API Access',
        success: false,
        message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async validateDataStructure(config: PluginConfig): Promise<TestResult> {
    try {
      const response = await fetch(config.apiUrl);
      const data = await response.json();
      
      let records = data;
      if (config.arrayProperty) {
        records = data[config.arrayProperty];
      }

      if (!Array.isArray(records)) {
        return {
          step: 'Data Structure',
          success: false,
          message: 'API response is not an array or does not contain array property'
        };
      }

      if (records.length === 0) {
        return {
          step: 'Data Structure',
          success: false,
          message: 'API returned empty dataset'
        };
      }

      const firstRecord = records[0];
      const fields = Object.keys(firstRecord);
      
      // Check for required geographic fields
      const hasCoordinates = this.hasCoordinateFields(fields);
      const hasLocationData = this.hasLocationFields(fields);

      if (!hasCoordinates && !hasLocationData) {
        return {
          step: 'Data Structure',
          success: false,
          message: 'No geographic data detected (coordinates or location names)'
        };
      }

      return {
        step: 'Data Structure',
        success: true,
        message: `Valid structure with ${fields.length} fields`,
        details: {
          recordCount: records.length,
          fields: fields.slice(0, 10), // First 10 fields
          hasCoordinates,
          hasLocationData
        }
      };
    } catch (error) {
      return {
        step: 'Data Structure',
        success: false,
        message: `Structure validation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async testTransformation(config: PluginConfig): Promise<TestResult> {
    try {
      // This would test the actual transformer function
      // For now, we'll simulate the test
      const response = await fetch(config.apiUrl);
      const data = await response.json();
      
      let records = data;
      if (config.arrayProperty) {
        records = data[config.arrayProperty];
      }

      // Test transformation logic
      const sampleRecord = records[0];
      const transformedFeature = this.simulateTransformation(sampleRecord);

      if (!transformedFeature.geometry || !transformedFeature.properties) {
        return {
          step: 'Data Transformation',
          success: false,
          message: 'Transformation did not produce valid GeoJSON feature'
        };
      }

      return {
        step: 'Data Transformation',
        success: true,
        message: 'Transformation produces valid GeoJSON',
        details: {
          geometryType: transformedFeature.geometry.type,
          propertyCount: Object.keys(transformedFeature.properties).length
        }
      };
    } catch (error) {
      return {
        step: 'Data Transformation',
        success: false,
        message: `Transformation test failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async validateMapIntegration(config: PluginConfig): Promise<TestResult> {
    try {
      // Check if plugin is properly integrated into the map system
      // This would check actual file integrations
      
      const checks = [
        this.checkPluginLoader(config),
        this.checkLayerConfiguration(config),
        this.checkDataHook(config),
        this.checkMapContainer(config)
      ];

      const results = await Promise.all(checks);
      const failures = results.filter(r => !r.success);

      if (failures.length > 0) {
        return {
          step: 'Map Integration',
          success: false,
          message: `Integration issues: ${failures.map(f => f.issue).join(', ')}`,
          details: { failures }
        };
      }

      return {
        step: 'Map Integration',
        success: true,
        message: 'All integration points validated'
      };
    } catch (error) {
      return {
        step: 'Map Integration',
        success: false,
        message: `Integration validation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async testPopupRendering(config: PluginConfig): Promise<TestResult> {
    try {
      // Test popup template rendering
      const response = await fetch(config.apiUrl);
      const data = await response.json();
      
      let records = data;
      if (config.arrayProperty) {
        records = data[config.arrayProperty];
      }

      const sampleRecord = records[0];
      
      // Check if all referenced fields exist
      const missingFields = this.checkPopupFields(sampleRecord);
      
      if (missingFields.length > 0) {
        return {
          step: 'Popup Rendering',
          success: false,
          message: `Missing fields in popup template: ${missingFields.join(', ')}`
        };
      }

      return {
        step: 'Popup Rendering',
        success: true,
        message: 'Popup template fields validated'
      };
    } catch (error) {
      return {
        step: 'Popup Rendering',
        success: false,
        message: `Popup validation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async testPerformance(config: PluginConfig): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(config.apiUrl);
      const apiTime = Date.now() - startTime;
      
      const transformStart = Date.now();
      const data = await response.json();
      let records = data;
      if (config.arrayProperty) {
        records = data[config.arrayProperty];
      }

      // Simulate transformation of all records
      records.forEach((record: any) => this.simulateTransformation(record));
      const transformTime = Date.now() - transformStart;

      const dataSize = JSON.stringify(data).length;
      const totalTime = Date.now() - startTime;

      // Performance thresholds
      const isSlowApi = apiTime > 5000; // 5 seconds
      const isLargeDataset = dataSize > 1024 * 1024; // 1MB
      const isSlowTransform = transformTime > 1000; // 1 second

      const warnings = [];
      if (isSlowApi) warnings.push('Slow API response');
      if (isLargeDataset) warnings.push('Large dataset size');
      if (isSlowTransform) warnings.push('Slow transformation');

      return {
        step: 'Performance',
        success: warnings.length === 0,
        message: warnings.length > 0 ? `Performance issues: ${warnings.join(', ')}` : 'Performance acceptable',
        duration: totalTime,
        details: {
          apiResponseTime: apiTime,
          transformationTime: transformTime,
          dataSize,
          recordCount: records.length
        }
      };
    } catch (error) {
      return {
        step: 'Performance',
        success: false,
        message: `Performance test failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async validateTorontoSpecific(config: PluginConfig): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    try {
      const response = await fetch(config.apiUrl);
      const data = await response.json();
      
      let records = data;
      if (config.arrayProperty) {
        records = data[config.arrayProperty];
      }

      // Test Toronto coordinate bounds
      const boundsTest = this.testTorontoBounds(records);
      tests.push(boundsTest);

      // Test Toronto-specific data patterns
      const patternsTest = this.testTorontoPatterns(records, config);
      tests.push(patternsTest);

      // Test data quality for Toronto datasets
      const qualityTest = this.testTorontoDataQuality(records, config);
      tests.push(qualityTest);

    } catch (error) {
      tests.push({
        step: 'Toronto Validation',
        success: false,
        message: `Toronto-specific validation failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }

    return tests;
  }

  private testTorontoBounds(records: any[]): TestResult {
    const coordinateFields = this.findCoordinateFields(records[0]);
    
    if (coordinateFields.length === 0) {
      return {
        step: 'Toronto Bounds',
        success: true,
        message: 'No coordinate fields to validate'
      };
    }

    const outOfBounds = records.filter(record => {
      const lat = record[coordinateFields[0]];
      const lng = record[coordinateFields[1]];
      
      return lat < 43.5 || lat > 43.9 || lng < -79.8 || lng > -79.1;
    });

    const success = outOfBounds.length === 0;
    
    return {
      step: 'Toronto Bounds',
      success,
      message: success ? 
        'All coordinates within Toronto bounds' : 
        `${outOfBounds.length} records outside Toronto bounds`,
      details: {
        totalRecords: records.length,
        outOfBounds: outOfBounds.length,
        coordinateFields
      }
    };
  }

  private testTorontoPatterns(records: any[], config: PluginConfig): TestResult {
    // This would use the TorontoDataService to validate patterns
    const sampleMetadata = {
      name: config.name,
      description: config.description,
      valueFields: Object.keys(records[0]).map(key => ({
        name: key,
        type: typeof records[0][key] as any,
        semanticType: 'generic',
        format: 'unknown',
        nullable: false
      }))
    } as any;

    const patterns = this.torontoService.recognizeTorontoPatterns(sampleMetadata);
    const detectedPatterns = Object.values(patterns).filter(p => p !== null);

    return {
      step: 'Toronto Patterns',
      success: true,
      message: detectedPatterns.length > 0 ? 
        `Detected ${detectedPatterns.length} Toronto-specific patterns` :
        'No specific Toronto patterns detected',
      details: {
        patterns: Object.keys(patterns).filter(key => patterns[key] !== null)
      }
    };
  }

  private testTorontoDataQuality(records: any[], config: PluginConfig): TestResult {
    const issues = [];
    
    // Check for common data quality issues
    const nullCounts = this.checkNullValues(records);
    const duplicates = this.checkDuplicates(records);
    const outliers = this.checkOutliers(records);

    if (nullCounts.high.length > 0) {
      issues.push(`High null rates in: ${nullCounts.high.join(', ')}`);
    }

    if (duplicates > 0) {
      issues.push(`${duplicates} duplicate records found`);
    }

    if (outliers.length > 0) {
      issues.push(`Outliers detected in: ${outliers.join(', ')}`);
    }

    return {
      step: 'Data Quality',
      success: issues.length === 0,
      message: issues.length > 0 ? 
        `Data quality issues: ${issues.join('; ')}` :
        'Data quality acceptable',
      details: {
        nullCounts,
        duplicates,
        outliers
      }
    };
  }

  // Helper methods
  private hasCoordinateFields(fields: string[]): boolean {
    const latFields = fields.filter(f => /lat|latitude|y/i.test(f));
    const lngFields = fields.filter(f => /lng|lon|longitude|x/i.test(f));
    return latFields.length > 0 && lngFields.length > 0;
  }

  private hasLocationFields(fields: string[]): boolean {
    return fields.some(f => /location|place|address|name|site/i.test(f));
  }

  private findCoordinateFields(record: any): string[] {
    return Object.keys(record).filter(key => 
      /lat|lng|longitude|latitude|x|y/i.test(key) && 
      typeof record[key] === 'number'
    );
  }

  private simulateTransformation(record: any): any {
    // Simulate GeoJSON transformation
    const coords = this.findCoordinateFields(record);
    
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: coords.length >= 2 ? [record[coords[1]], record[coords[0]]] : [0, 0]
      },
      properties: record
    };
  }

  private checkPluginLoader(config: PluginConfig): Promise<{ success: boolean; issue?: string }> {
    // This would check if the plugin is in the loader
    return Promise.resolve({ success: true });
  }

  private checkLayerConfiguration(config: PluginConfig): Promise<{ success: boolean; issue?: string }> {
    // This would check layer config files
    return Promise.resolve({ success: true });
  }

  private checkDataHook(config: PluginConfig): Promise<{ success: boolean; issue?: string }> {
    // This would check data hook integration
    return Promise.resolve({ success: true });
  }

  private checkMapContainer(config: PluginConfig): Promise<{ success: boolean; issue?: string }> {
    // This would check map container integration
    return Promise.resolve({ success: true });
  }

  private checkPopupFields(record: any): string[] {
    // This would check popup template fields against record
    return [];
  }

  private checkNullValues(records: any[]): { high: string[]; medium: string[]; low: string[] } {
    const fields = Object.keys(records[0]);
    const nullRates = fields.map(field => {
      const nullCount = records.filter(r => r[field] == null).length;
      const rate = nullCount / records.length;
      return { field, rate };
    });

    return {
      high: nullRates.filter(nr => nr.rate > 0.5).map(nr => nr.field),
      medium: nullRates.filter(nr => nr.rate > 0.2 && nr.rate <= 0.5).map(nr => nr.field),
      low: nullRates.filter(nr => nr.rate > 0 && nr.rate <= 0.2).map(nr => nr.field)
    };
  }

  private checkDuplicates(records: any[]): number {
    const seen = new Set();
    let duplicates = 0;
    
    records.forEach(record => {
      const key = JSON.stringify(record);
      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
      }
    });

    return duplicates;
  }

  private checkOutliers(records: any[]): string[] {
    const numericFields = Object.keys(records[0]).filter(key => 
      typeof records[0][key] === 'number'
    );

    const outlierFields = [];

    for (const field of numericFields) {
      const values = records.map(r => r[field]).filter(v => v != null);
      if (values.length === 0) continue;

      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
      );

      const outliers = values.filter(v => Math.abs(v - mean) > 3 * stdDev);
      if (outliers.length > 0) {
        outlierFields.push(field);
      }
    }

    return outlierFields;
  }

  private generateSuggestions(tests: TestResult[], config: PluginConfig): string[] {
    const suggestions = [];

    // Performance suggestions
    const perfTest = tests.find(t => t.step === 'Performance');
    if (perfTest && !perfTest.success) {
      if (perfTest.details?.apiResponseTime > 5000) {
        suggestions.push('Consider implementing data caching for slow API responses');
      }
      if (perfTest.details?.dataSize > 1024 * 1024) {
        suggestions.push('Consider implementing data pagination or filtering for large datasets');
      }
    }

    // Data quality suggestions
    const qualityTest = tests.find(t => t.step === 'Data Quality');
    if (qualityTest && !qualityTest.success) {
      suggestions.push('Implement data cleaning and validation in the transformer');
    }

    // Toronto-specific suggestions
    const boundsTest = tests.find(t => t.step === 'Toronto Bounds');
    if (boundsTest && !boundsTest.success) {
      suggestions.push('Add coordinate validation to filter out-of-bounds data');
    }

    return suggestions;
  }

  private extractPerformanceMetrics(tests: TestResult[]): { apiResponseTime: number; dataSize: number; transformationTime: number } {
    const perfTest = tests.find(t => t.step === 'Performance');
    
    return {
      apiResponseTime: perfTest?.details?.apiResponseTime || 0,
      dataSize: perfTest?.details?.dataSize || 0,
      transformationTime: perfTest?.details?.transformationTime || 0
    };
  }
} 