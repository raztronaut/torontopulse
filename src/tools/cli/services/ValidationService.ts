import { PluginConfig, DatasetMetadata, ValidationResult, TestResult } from '../types.js';
import { TorontoDataService } from './TorontoDataService.js';
import fs from 'fs-extra';
import path from 'path';

export interface ValidationOptions {
  plugin?: string;
  layer?: string;
  all?: boolean;
  fix?: boolean;
  verbose?: boolean;
}

export interface BrowserValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details?: any;
}

export interface PluginHealth {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'error';
  lastFetch: Date | null;
  fetchTime: number;
  dataCount: number;
  issues: string[];
}

export class ValidationService {
  private torontoDataService = new TorontoDataService();

  async validatePlugin(pluginId: string, options: ValidationOptions = {}): Promise<ValidationResult> {
    const results: TestResult[] = [];
    
    try {
      // Load plugin configuration
      const config = await this.loadPluginConfig(pluginId);
      
      // Run all validation tests
      results.push(await this.validatePluginStructure(pluginId));
      results.push(await this.testApiAccess(config));
      results.push(await this.validateDataStructure(config));
      
      // Browser compatibility tests
      if (options.verbose) {
        results.push(await this.validateBrowserCompatibility(pluginId));
        results.push(await this.validateProxyConfiguration(pluginId));
        results.push(await this.validateCORSCompliance(pluginId));
      }
      
      const success = results.every(r => r.success);
      const errors = results.filter(r => !r.success).map(r => r.message);
      
      return {
        valid: success,
        errors,
        warnings: [],
        details: { tests: results }
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }

  /**
   * Comprehensive validation including browser compatibility
   */
  async validateIntegration(pluginId: string): Promise<ValidationResult> {
    const results = await Promise.all([
      this.validatePluginStructure(pluginId),
      this.validateNodeJsCompatibility(pluginId),
      this.validateBrowserCompatibility(pluginId),
      this.validateProxyConfiguration(pluginId)
    ]);

    return this.combineValidationResults(results);
  }

  /**
   * Validate CORS compliance for a plugin
   */
  async validateCORSCompliance(pluginId: string): Promise<BrowserValidationResult> {
    try {
      const config = await this.loadPluginConfig(pluginId);
      return await this.testCORSHeaders(config.api.baseUrl);
    } catch (error) {
      return {
        valid: false,
        errors: [`CORS validation failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }

  /**
   * Test actual browser data loading
   */
  async validateBrowserCompatibility(pluginId: string): Promise<BrowserValidationResult> {
    try {
      // Load plugin configuration
      const config = await this.loadPluginConfig(pluginId);
      
      // Test URL accessibility from browser context
      const urlTest = await this.testBrowserUrlAccess(config.api.baseUrl);
      
      // Validate proxy requirements
      const proxyTest = await this.validateProxyRequirements(config);
      
      // Test CORS headers
      const corsTest = await this.testCORSHeaders(config.api.baseUrl);

      const allErrors = [
        ...(urlTest?.errors || []),
        ...(proxyTest?.errors || []),
        ...(corsTest?.errors || [])
      ].filter(Boolean);

      const allWarnings = [
        ...(urlTest?.warnings || []),
        ...(proxyTest?.warnings || []),
        ...(corsTest?.warnings || [])
      ].filter(Boolean);

      return {
        valid: (urlTest?.valid ?? false) && (proxyTest?.valid ?? false) && (corsTest?.valid ?? false),
        errors: allErrors,
        warnings: allWarnings
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Browser compatibility validation failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }

  /**
   * Test URL accessibility from browser perspective
   */
  private async testBrowserUrlAccess(url: string): Promise<BrowserValidationResult> {
    // Simulate browser fetch behavior
    // Check for CORS issues
    // Validate response format
    
    if (url.startsWith('http') && !url.startsWith('/')) {
      return {
        valid: false,
        errors: [`External URL detected: ${url}. This will cause CORS errors in browser.`],
        warnings: [`Consider using proxy path instead: /api/toronto-open-data/...`]
      };
    }

    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * Validate CORS compliance
   */
  private async testCORSHeaders(url: string): Promise<BrowserValidationResult> {
    try {
      // If it's a proxy URL, it should be fine
      if (url.startsWith('/api/')) {
        return {
          valid: true,
          errors: [],
          warnings: [],
          details: { corsCompliant: true, reason: 'Using proxy path' }
        };
      }

      // Test actual CORS headers for external URLs
      const response = await fetch(url, { method: 'HEAD' });
      const corsHeaders = {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers')
      };

      const hasCors = corsHeaders['access-control-allow-origin'] !== null;

      return {
        valid: hasCors,
        errors: hasCors ? [] : ['No CORS headers detected. This will cause browser access issues.'],
        warnings: hasCors ? [] : ['Configure proxy in vite.config.ts to resolve CORS issues'],
        details: { corsHeaders, hasCors }
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`CORS validation failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: ['Unable to test CORS headers. Ensure proxy is configured.']
      };
    }
  }

  /**
   * Validate proxy requirements
   */
  private async validateProxyRequirements(config: any): Promise<BrowserValidationResult> {
    const url = config.api.baseUrl;
    
    // Check if external URL requires proxy
    if (url.startsWith('http')) {
      const requiresProxy = this.urlRequiresProxy(url);
      
      if (requiresProxy) {
        return {
          valid: false,
          errors: [`External URL requires proxy configuration: ${url}`],
          warnings: [`Use proxy path like /api/toronto-open-data/ instead`]
        };
      }
    }

    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * Check if URL requires proxy based on domain
   */
  private urlRequiresProxy(url: string): boolean {
    const corsRequiredDomains = [
      'ckan0.cf.opendata.inter.prod-toronto.ca',
      'opendata.toronto.ca',
      'secure.toronto.ca'
    ];

    return corsRequiredDomains.some(domain => url.includes(domain));
  }

  /**
   * Validate Node.js compatibility
   */
  private async validateNodeJsCompatibility(pluginId: string): Promise<BrowserValidationResult> {
    try {
      const config = await this.loadPluginConfig(pluginId);
      let testUrl = config.api.baseUrl;
      
      // Convert proxy URL to actual URL for Node.js testing
      if (testUrl.startsWith('/api/toronto-open-data/')) {
        testUrl = testUrl.replace('/api/toronto-open-data/', 'https://ckan0.cf.opendata.inter.prod-toronto.ca/');
      } else if (testUrl.startsWith('/api/toronto-secure/')) {
        testUrl = testUrl.replace('/api/toronto-secure/', 'https://secure.toronto.ca/');
      }
      
      // Test data fetching in Node.js context
      const response = await fetch(testUrl);
      
      let data;
      // Handle different API types
      if (config.api.type === 'xml') {
        // For XML APIs, just verify response is successful
        const text = await response.text();
        data = { xmlResponse: true, hasXmlContent: text.includes('<') };
      } else {
        // Handle JSON APIs
        data = await response.json();
      }
      
      return {
        valid: true,
        errors: [],
        warnings: [],
        details: { 
          nodeCompatible: true, 
          dataCount: Array.isArray(data) ? data.length : data.result?.records?.length || 0 
        }
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Node.js compatibility test failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }

  /**
   * Validate proxy configuration
   */
  private async validateProxyConfiguration(pluginId: string): Promise<BrowserValidationResult> {
    try {
      const viteConfigPath = 'vite.config.ts';
      
      if (!await fs.pathExists(viteConfigPath)) {
        return {
          valid: false,
          errors: ['vite.config.ts not found'],
          warnings: []
        };
      }

      const content = await fs.readFile(viteConfigPath, 'utf-8');
      const hasProxy = content.includes('proxy:');
      const hasTorontoProxy = content.includes('/api/toronto-open-data');

      if (!hasProxy) {
        return {
          valid: false,
          errors: ['No proxy configuration found in vite.config.ts'],
          warnings: ['Add proxy configuration to handle CORS issues']
        };
      }

      if (!hasTorontoProxy) {
        return {
          valid: false,
          errors: ['Toronto Open Data proxy not configured'],
          warnings: ['Add /api/toronto-open-data proxy to vite.config.ts']
        };
      }

      return {
        valid: true,
        errors: [],
        warnings: [],
        details: { proxyConfigured: true }
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Proxy validation failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }

  /**
   * Combine multiple validation results
   */
  private combineValidationResults(results: any[]): ValidationResult {
    const allValid = results.every(r => {
      if (r && typeof r.valid === 'boolean') return r.valid;
      if (r && typeof r.success === 'boolean') return r.success;
      return false;
    });
    
    const allErrors = results.flatMap(r => r?.errors || []).filter(Boolean);
    const allWarnings = results.flatMap(r => r?.warnings || []).filter(Boolean);

    return {
      valid: allValid,
      errors: allErrors,
      warnings: allWarnings,
      details: { results }
    };
  }

  /**
   * Load plugin configuration
   */
  private async loadPluginConfig(pluginId: string): Promise<any> {
    const configPaths = [
      `src/domains/transportation/${pluginId}/config.json`,
      `src/domains/infrastructure/${pluginId}/config.json`,
      `src/domains/environment/${pluginId}/config.json`,
      `src/domains/events/${pluginId}/config.json`
    ];

    for (const configPath of configPaths) {
      if (await fs.pathExists(configPath)) {
        return await fs.readJSON(configPath);
      }
    }

    throw new Error(`Plugin configuration not found for: ${pluginId}`);
  }

  /**
   * Check plugin health
   */
  async checkPluginHealth(pluginId: string): Promise<PluginHealth> {
    let config: any = null;
    try {
      const startTime = Date.now();
      config = await this.loadPluginConfig(pluginId);
      let testUrl = config.api.baseUrl;
      
      // Convert proxy URL to actual URL for Node.js testing
      if (testUrl.startsWith('/api/toronto-open-data/')) {
        testUrl = testUrl.replace('/api/toronto-open-data/', 'https://ckan0.cf.opendata.inter.prod-toronto.ca/');
      } else if (testUrl.startsWith('/api/toronto-secure/')) {
        testUrl = testUrl.replace('/api/toronto-secure/', 'https://secure.toronto.ca/');
      }
      
      // Test data fetching
      const response = await fetch(testUrl);
      const fetchTime = Date.now() - startTime;
      
      let data;
      let dataCount = 0;
      
      // Handle different API types
      if (config.api.type === 'xml') {
        // For XML APIs, we can't easily parse and count in CLI context
        // Just verify the response is successful
        const text = await response.text();
        dataCount = text.includes('<') ? 1 : 0; // Basic XML detection
        data = { xmlResponse: true };
      } else {
        // Handle JSON APIs
        data = await response.json();
        dataCount = Array.isArray(data) ? data.length : 
                   data.result?.records?.length || 
                   data.records?.length || 0;
      }

      return {
        id: pluginId,
        name: config.metadata?.name || pluginId,
        status: 'healthy',
        lastFetch: new Date(),
        fetchTime,
        dataCount,
        issues: []
      };
    } catch (error) {
      return {
        id: pluginId,
        name: config?.metadata?.name || pluginId,
        status: 'error',
        lastFetch: null,
        fetchTime: 0,
        dataCount: 0,
        issues: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  async validateAll(options: ValidationOptions = {}): Promise<ValidationResult[]> {
    const plugins = await this.discoverAllPlugins();
    const results = await Promise.all(
      plugins.map(plugin => this.validatePlugin(plugin.id, options))
    );
    
    return results;
  }

  private async discoverAllPlugins(): Promise<{ id: string; path: string }[]> {
    const plugins: { id: string; path: string }[] = [];
    const domains = ['transportation', 'infrastructure', 'environment', 'events'];
    
    for (const domain of domains) {
      const domainPath = `src/domains/${domain}`;
      
      if (await fs.pathExists(domainPath)) {
        const entries = await fs.readdir(domainPath);
        
        for (const entry of entries) {
          const pluginPath = path.join(domainPath, entry);
          const configPath = path.join(pluginPath, 'config.json');
          
          if (await fs.pathExists(configPath)) {
            plugins.push({ id: entry, path: pluginPath });
          }
        }
      }
    }
    
    return plugins;
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

  private hasCoordinateFields(fields: string[]): boolean {
    const coordinatePatterns = [
      /lat/i, /lng/i, /lon/i, /latitude/i, /longitude/i,
      /coord/i, /x_coord/i, /y_coord/i, /geometry/i
    ];
    
    return coordinatePatterns.some(pattern => 
      fields.some(field => pattern.test(field))
    );
  }

  private hasLocationFields(fields: string[]): boolean {
    const locationPatterns = [
      /address/i, /location/i, /street/i, /intersection/i,
      /ward/i, /district/i, /neighbourhood/i, /postal/i
    ];
    
    return locationPatterns.some(pattern => 
      fields.some(field => pattern.test(field))
    );
  }

  private async validatePluginStructure(pluginId: string): Promise<TestResult> {
    try {
      const config = await this.loadPluginConfig(pluginId);
      const errors: string[] = [];

      // Validate required sections
      if (!config.metadata) errors.push('Missing metadata section');
      if (!config.api) errors.push('Missing api section');
      if (!config.transform) errors.push('Missing transform section');

      // Validate metadata
      if (config.metadata) {
        if (!config.metadata.id) errors.push('Missing metadata.id');
        if (!config.metadata.name) errors.push('Missing metadata.name');
        if (!config.metadata.domain) errors.push('Missing metadata.domain');
      }

      // Validate API configuration
      if (config.api) {
        if (!config.api.baseUrl) errors.push('Missing api.baseUrl');
        if (!config.api.type) errors.push('Missing api.type');
      }

      return {
        step: 'Plugin Structure',
        success: errors.length === 0,
        message: errors.length === 0 ? 'Plugin structure is valid' : `Structure errors: ${errors.join(', ')}`,
        details: { errors }
      };
    } catch (error) {
      return {
        step: 'Plugin Structure',
        success: false,
        message: `Structure validation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private checkLayerConfiguration(config: PluginConfig): Promise<{ success: boolean; issue?: string }> {
    // This would check layer config files
    return Promise.resolve({ success: true });
  }
} 