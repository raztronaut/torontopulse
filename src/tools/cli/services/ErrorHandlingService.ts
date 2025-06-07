import { IntegrationError, RecoveryAction } from '../types.js';
import { ProxyConfigService } from './ProxyConfigService.js';
import { CkanApiService } from './CkanApiService.js';

export class ErrorHandlingService {
  private proxyService = new ProxyConfigService();
  private ckanService = new CkanApiService();

  async handleError(error: IntegrationError): Promise<RecoveryAction> {
    switch (error.type) {
      case 'CORS_ERROR':
        return this.handleCorsError(error);
      
      case 'INVALID_RESOURCE_ID':
        return this.handleInvalidResourceError(error);
      
      case 'TRANSFORMATION_ERROR':
        return this.handleTransformationError(error);
      
      case 'VALIDATION_ERROR':
        return this.handleValidationError(error);
      
      default:
        return this.handleUnknownError(error);
    }
  }

  private async handleCorsError(error: IntegrationError): Promise<RecoveryAction> {
    try {
      // Extract URL from error details
      const url = error.details?.url || error.message.match(/https?:\/\/[^\s]+/)?.[0];
      
      if (url) {
        await this.proxyService.addProxyForUrl(url);
        
        return {
          action: 'configure_proxy',
          message: 'CORS error detected. Configured Vite proxy automatically.',
          autoFix: true
        };
      }
      
      return {
        action: 'configure_proxy',
        message: 'CORS error detected. Please configure proxy manually in vite.config.ts',
        autoFix: false,
        requiresInput: true
      };
    } catch (proxyError) {
      return {
        action: 'manual_intervention',
        message: `Failed to configure proxy: ${proxyError}. Manual configuration required.`,
        autoFix: false,
        requiresInput: true
      };
    }
  }

  private async handleInvalidResourceError(error: IntegrationError): Promise<RecoveryAction> {
    try {
      const datasetUrl = error.details?.datasetUrl;
      
      if (datasetUrl) {
        // Try to discover valid resources
        const metadata = await this.ckanService.discoverDataset(datasetUrl);
        
        return {
          action: 'discover_resources',
          message: `Invalid resource ID. Found valid resource: ${metadata.resourceId}`,
          autoFix: true
        };
      }
      
      return {
        action: 'discover_resources',
        message: 'Invalid resource ID. Please check the dataset URL and try again.',
        autoFix: false,
        requiresInput: true
      };
    } catch (discoveryError) {
      return {
        action: 'manual_intervention',
        message: `Could not discover valid resources: ${discoveryError}`,
        autoFix: false,
        requiresInput: true
      };
    }
  }

  private handleTransformationError(error: IntegrationError): RecoveryAction {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('nested') || errorMessage.includes('array')) {
      return {
        action: 'regenerate_transformer',
        message: 'Data transformation failed. The API structure may have changed. Please check the arrayProperty configuration.',
        autoFix: false,
        requiresInput: true
      };
    }
    
    if (errorMessage.includes('coordinate') || errorMessage.includes('geographic')) {
      return {
        action: 'regenerate_transformer',
        message: 'Geographic data transformation failed. Please verify coordinate field mappings.',
        autoFix: false,
        requiresInput: true
      };
    }
    
    return {
      action: 'regenerate_transformer',
      message: `Data transformation failed: ${error.message}. Please review the transformer implementation.`,
      autoFix: false,
      requiresInput: true
    };
  }

  private handleValidationError(error: IntegrationError): RecoveryAction {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('geographic') || errorMessage.includes('coordinate')) {
      return {
        action: 'manual_intervention',
        message: 'Data validation failed due to invalid geographic coordinates. Please check data quality and coordinate mappings.',
        autoFix: false,
        requiresInput: true
      };
    }
    
    if (errorMessage.includes('schema') || errorMessage.includes('structure')) {
      return {
        action: 'regenerate_transformer',
        message: 'Data validation failed due to schema mismatch. The API structure may have changed.',
        autoFix: false,
        requiresInput: true
      };
    }
    
    return {
      action: 'manual_intervention',
      message: `Data validation failed: ${error.message}. Please review data quality and validation rules.`,
      autoFix: false,
      requiresInput: true
    };
  }

  private handleUnknownError(error: IntegrationError): RecoveryAction {
    return {
      action: 'manual_intervention',
      message: `Unexpected error: ${error.message}. Please check the logs and try again.`,
      autoFix: false,
      requiresInput: true
    };
  }

  async executeRecoveryAction(action: RecoveryAction, context?: any): Promise<boolean> {
    if (!action.autoFix) {
      console.warn(`⚠️  ${action.message}`);
      return false;
    }

    try {
      switch (action.action) {
        case 'configure_proxy':
          if (context?.url) {
            await this.proxyService.addProxyForUrl(context.url);
            console.log(`✅ ${action.message}`);
            return true;
          }
          break;
          
        case 'discover_resources':
          if (context?.datasetUrl) {
            const metadata = await this.ckanService.discoverDataset(context.datasetUrl);
            console.log(`✅ Discovered valid resource: ${metadata.resourceId}`);
            return true;
          }
          break;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Recovery action failed: ${error}`);
      return false;
    }
  }

  createIntegrationError(
    type: IntegrationError['type'], 
    message: string, 
    details?: any
  ): IntegrationError {
    const error = new Error(message) as IntegrationError;
    error.type = type;
    error.details = details;
    return error;
  }

  async validateApiAccess(url: string): Promise<void> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      
      if (!response.ok) {
        if (response.status === 0 || response.type === 'opaque') {
          throw this.createIntegrationError(
            'CORS_ERROR',
            `CORS policy blocks access to ${url}`,
            { url, status: response.status }
          );
        }
        
        throw this.createIntegrationError(
          'INVALID_RESOURCE_ID',
          `API returned ${response.status}: ${response.statusText}`,
          { url, status: response.status }
        );
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('CORS')) {
        throw this.createIntegrationError(
          'CORS_ERROR',
          `CORS policy blocks access to ${url}`,
          { url, originalError: error }
        );
      }
      
      if (error instanceof IntegrationError) {
        throw error;
      }
      
      throw this.createIntegrationError(
        'UNKNOWN_ERROR',
        `Failed to access API: ${error}`,
        { url, originalError: error }
      );
    }
  }

  async validateDataStructure(data: any, expectedStructure?: any): Promise<void> {
    if (!data) {
      throw this.createIntegrationError(
        'VALIDATION_ERROR',
        'API returned null or undefined data',
        { data }
      );
    }

    if (expectedStructure?.arrayProperty) {
      const nestedData = this.getNestedProperty(data, expectedStructure.arrayProperty);
      
      if (!Array.isArray(nestedData)) {
        throw this.createIntegrationError(
          'TRANSFORMATION_ERROR',
          `Expected array at property "${expectedStructure.arrayProperty}" but found ${typeof nestedData}`,
          { data, arrayProperty: expectedStructure.arrayProperty }
        );
      }
      
      if (nestedData.length === 0) {
        console.warn('⚠️  API returned empty array - this may be expected');
      }
    } else if (!Array.isArray(data)) {
      throw this.createIntegrationError(
        'TRANSFORMATION_ERROR',
        `Expected array but received ${typeof data}`,
        { data }
      );
    }
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
} 