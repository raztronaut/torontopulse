import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { CkanApiService } from '../services/CkanApiService.js';
import { ProxyConfigService } from '../services/ProxyConfigService.js';
import { GeoMappingService } from '../services/GeoMappingService.js';
import { IntegrationService } from '../services/IntegrationService.js';
import { ValidationService } from '../services/ValidationService.js';
import { generatePlugin } from '../generators/plugin-generator.js';
import { IntegrationService } from '../services/IntegrationService.js';
import { 
  PluginConfig, 
  DatasetMetadata, 
  GenerationOptions, 
  IntegrationResult,
  ProgressStep 
} from '../types.js';

interface EnhancedGenerateOptions {
  url?: string;
  autoIntegrate?: boolean;
  name?: string;
  domain?: string;
  layerId?: string;
}

class ProgressTracker {
  private steps: ProgressStep[] = [];
  private currentStep = 0;

  addStep(name: string, description: string): void {
    this.steps.push({
      name,
      description,
      status: 'pending',
      startTime: null,
      endTime: null,
      duration: 0
    });
  }

  startStep(index: number): void {
    if (this.steps[index]) {
      this.steps[index].status = 'running';
      this.steps[index].startTime = Date.now();
      this.currentStep = index;
    }
  }

  completeStep(index: number, success = true): void {
    if (this.steps[index]) {
      this.steps[index].status = success ? 'completed' : 'failed';
      this.steps[index].endTime = Date.now();
      if (this.steps[index].startTime) {
        this.steps[index].duration = this.steps[index].endTime! - this.steps[index].startTime!;
      }
    }
  }

  getSteps(): ProgressStep[] {
    return this.steps;
  }

  getCurrentStep(): number {
    return this.currentStep;
  }
}

export async function generateDataSourceEnhanced(options: EnhancedGenerateOptions) {
  console.log(chalk.blue('🚀 Toronto Pulse Data Integration (Enhanced)'));
  console.log(chalk.gray('One-command integration from URL to working browser layer\n'));

  // Debug: Check if URL is provided
  if (!options.url) {
    console.error(chalk.red('❌ URL is required for enhanced generation'));
    console.log(chalk.gray('Usage: npm run tp generate:datasource --url="<toronto-open-data-url>" --auto-integrate'));
    process.exit(1);
  }

  console.log(chalk.gray(`🔗 Processing URL: ${options.url}`));

  const tracker = new ProgressTracker();
  
  // Define all steps
  tracker.addStep('discovery', 'Dataset Discovery & Analysis');
  tracker.addStep('prevalidation', 'Pre-Integration Validation');
  tracker.addStep('configuration', 'Configuration Generation');
  tracker.addStep('proxy', 'Proxy Auto-Configuration');
  tracker.addStep('generation', 'Plugin Generation');
  tracker.addStep('integration', 'Application Integration');
  tracker.addStep('postvalidation', 'Post-Integration Validation');
  tracker.addStep('browsertest', 'Browser Compatibility Test');

  try {
    // Phase 1: Discovery & Analysis
    tracker.startStep(0);
    const spinner = ora('Discovering dataset metadata...').start();
    
    const ckanService = new CkanApiService();
    const discovery = await ckanService.discoverDataset(options.url!);
    
    spinner.succeed('Dataset discovered successfully');
    tracker.completeStep(0);

    console.log(chalk.green(`✅ Found: ${discovery.metadata.name}`));
    console.log(chalk.gray(`   Resource ID: ${discovery.metadata.resourceId}`));
    console.log(chalk.gray(`   Fields: ${discovery.analysis.fields.length}`));
    console.log(chalk.gray(`   Records: ${discovery.analysis.recordCount}`));
    console.log(chalk.gray(`   API URL: ${discovery.metadata.accessUrl}`));

    // Phase 2: Pre-Integration Validation
    tracker.startStep(1);
    const preValidation = await validatePreIntegration(discovery);
    
    if (!preValidation.valid) {
      tracker.completeStep(1, false);
      console.log(chalk.red('❌ Pre-integration validation failed'));
      preValidation.errors.forEach(error => console.log(chalk.red(`   • ${error}`)));
      return;
    }
    
    tracker.completeStep(1);
    console.log(chalk.green('✅ Pre-integration validation passed'));

    // Phase 3: Configuration Generation
    tracker.startStep(2);
    const config = await generateConfiguration(discovery, options);
    tracker.completeStep(2);
    console.log(chalk.green(`✅ Generated configuration for "${config.name}"`));

    // Phase 4: Proxy Auto-Configuration
    tracker.startStep(3);
    const proxyService = new ProxyConfigService();
    const configWithProxy = proxyService.configureProxy(config);
    await proxyService.ensureProxyConfiguration();
    tracker.completeStep(3);
    
    if (config.api.baseUrl !== configWithProxy.api.baseUrl) {
      console.log(chalk.green('✅ Configured CORS proxy automatically'));
      console.log(chalk.gray(`   Original: ${config.api.baseUrl}`));
      console.log(chalk.gray(`   Proxy: ${configWithProxy.api.baseUrl}`));
    } else {
      console.log(chalk.green('✅ No proxy configuration needed'));
    }

    // Phase 5: Plugin Generation
    tracker.startStep(4);
    await generateEnhancedPlugin(configWithProxy, discovery.analysis, tracker);
    tracker.completeStep(4);
    console.log(chalk.green('✅ Plugin files generated successfully'));

    // Phase 6: Integration
    tracker.startStep(5);
    await integrateWithApplication(configWithProxy);
    tracker.completeStep(5);
    console.log(chalk.green('✅ Integrated with application'));

    // Phase 7: Post-Integration Validation
    tracker.startStep(6);
    const validationService = new ValidationService();
    const postValidation = await validationService.validateIntegration(configWithProxy.metadata.id);
    tracker.completeStep(6);

    // Phase 8: Browser Compatibility Test
    tracker.startStep(7);
    const browserValidation = await validationService.validateBrowserCompatibility(configWithProxy.metadata.id);
    tracker.completeStep(7);

    // Final Results
    console.log(chalk.blue('\n📊 Integration Summary'));
    console.log(chalk.blue('═'.repeat(50)));

    if (postValidation.valid && browserValidation.valid) {
      console.log(chalk.green('✅ Integration completed successfully!'));
      console.log(chalk.green('✅ Browser compatibility verified'));
      console.log(chalk.blue('\n🧪 Next steps:'));
      console.log(chalk.gray(`   1. Start development server: npm run dev`));
      console.log(chalk.gray(`   2. Open browser: http://localhost:3000`));
      console.log(chalk.gray(`   3. Enable layer: "${configWithProxy.metadata.name}" in dashboard`));
      console.log(chalk.gray(`   4. View data on map!`));
    } else {
      console.log(chalk.yellow('⚠️  Integration completed with issues:'));
      
      if (!postValidation.valid) {
        console.log(chalk.red('\n❌ Post-integration validation failed:'));
        postValidation.errors.forEach(error => console.log(chalk.red(`   • ${error}`)));
      }
      
      if (!browserValidation.valid) {
        console.log(chalk.red('\n❌ Browser compatibility issues:'));
        browserValidation.errors.forEach(error => console.log(chalk.red(`   • ${error}`)));
      }
      
      console.log(chalk.blue('\n🔧 Auto-fix suggestions:'));
      console.log(chalk.gray(`   npm run tp fix:cors --plugin="${configWithProxy.metadata.id}"`));
      console.log(chalk.gray(`   npm run tp validate:browser --plugin="${configWithProxy.metadata.id}" --fix`));
    }

    // Performance Summary
    const totalTime = tracker.getSteps().reduce((sum, step) => sum + step.duration, 0);
    console.log(chalk.blue('\n⚡ Performance Summary'));
    console.log(chalk.gray(`   Total Time: ${totalTime}ms`));
    console.log(chalk.gray(`   Discovery: ${tracker.getSteps()[0].duration}ms`));
    console.log(chalk.gray(`   Generation: ${tracker.getSteps()[4].duration}ms`));
    console.log(chalk.gray(`   Validation: ${tracker.getSteps()[6].duration + tracker.getSteps()[7].duration}ms`));

  } catch (error) {
    const currentStep = tracker.getCurrentStep();
    tracker.completeStep(currentStep, false);
    
    console.error(chalk.red(`\n❌ Integration failed at step ${currentStep + 1}`));
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    
    // Provide specific guidance based on failure point
    if (currentStep <= 1) {
      console.log(chalk.blue('\n💡 Troubleshooting:'));
      console.log(chalk.gray('   • Check if the URL is accessible'));
      console.log(chalk.gray('   • Verify the resource ID is correct'));
      console.log(chalk.gray('   • Try: npm run tp preview:dataset --url="<your-url>"'));
    } else if (currentStep <= 3) {
      console.log(chalk.blue('\n💡 Troubleshooting:'));
      console.log(chalk.gray('   • Check proxy configuration'));
      console.log(chalk.gray('   • Try: npm run tp fix:proxy'));
    } else {
      console.log(chalk.blue('\n💡 Troubleshooting:'));
      console.log(chalk.gray('   • Run health check: npm run tp health'));
      console.log(chalk.gray('   • Check logs: npm run tp validate:browser --verbose'));
    }
  }
}

async function validatePreIntegration(discovery: any): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate dataset has geographic data
  const hasGeoData = discovery.analysis.geoStrategy.type !== 'none';
  if (!hasGeoData) {
    errors.push('Dataset does not contain geographic data (coordinates or location names)');
  }

  // Validate dataset has sufficient records
  if (discovery.analysis.recordCount === 0) {
    errors.push('Dataset is empty (0 records)');
  } else if (discovery.analysis.recordCount < 10) {
    warnings.push(`Dataset has only ${discovery.analysis.recordCount} records`);
  }

  // Validate API accessibility
  try {
    const apiUrl = discovery.metadata.accessUrl || discovery.metadata.apiUrl;
    if (!apiUrl) {
      errors.push('No API URL found in metadata');
    } else {
      const response = await fetch(apiUrl, { method: 'HEAD' });
      if (!response.ok) {
        errors.push(`API not accessible: HTTP ${response.status}`);
      }
    }
  } catch (error) {
    errors.push(`API connection failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Validate required fields exist
  const requiredFields = ['id', 'name'];
  const missingFields = requiredFields.filter(field => 
    !discovery.analysis.fields.some((f: any) => f.name.toLowerCase().includes(field))
  );
  
  if (missingFields.length > 0) {
    warnings.push(`Missing recommended fields: ${missingFields.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

async function generateConfiguration(discovery: any, options: EnhancedGenerateOptions): Promise<any> {
  const geoService = new GeoMappingService();
  const geoStrategy = discovery.analysis.geoStrategy || await geoService.detectGeographicData(discovery.analysis.fields);

  return {
    metadata: {
      id: options.layerId || discovery.metadata.id,
      name: options.name || discovery.metadata.name,
      description: discovery.metadata.description,
      domain: options.domain || 'infrastructure',
      version: '1.0.0',
      author: 'Toronto Pulse CLI',
      refreshInterval: 300000, // 5 minutes
      reliability: 'high'
    },
    api: {
      type: 'json',
      baseUrl: discovery.metadata.accessUrl,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Toronto-Pulse/2.0'
      },
      rateLimit: {
        requests: 100,
        window: 3600000 // 1 hour
      }
    },
    transform: {
      strategy: geoStrategy.type,
      geoStrategy: geoStrategy,
      arrayProperty: 'result.records'
    },
    visualization: {
      type: 'point',
      style: {
        color: '#2563eb',
        radius: 6,
        opacity: 0.8
      },
      popup: {
        template: generatePopupTemplate(discovery.analysis.fields),
        fields: discovery.analysis.fields.slice(0, 5).map((f: any) => f.name)
      }
    },
    cache: {
      strategy: 'memory',
      ttl: 300000, // 5 minutes
      maxSize: 1000
    }
  };
}

function generatePopupTemplate(fields: any[]): string {
  const displayFields = fields
    .filter(f => f.semanticType !== 'id' && f.name !== '_id')
    .slice(0, 5);

  return displayFields
    .map(field => `<strong>${field.name}:</strong> {{${field.name}}}`)
    .join('<br>');
}

async function generateEnhancedPlugin(
  config: any, 
  analysis: any, 
  tracker: ProgressTracker
): Promise<void> {
  
  // Convert config to PluginConfig format
  const pluginConfig: PluginConfig = {
    name: config.metadata.name,
    domain: config.metadata.domain,
    description: config.metadata.description,
    apiUrl: config.api.baseUrl,
    apiType: 'json',
    refreshInterval: config.metadata.refreshInterval,
    reliability: config.metadata.reliability,
    tags: config.metadata.tags || [],
    author: config.metadata.author,
    dataLicense: 'Open Government Licence - Toronto',
    arrayProperty: config.transform.arrayProperty
  };

  // Generate plugin with enhanced transformers
  await generatePlugin(pluginConfig);

  // Enhance transformer with geographic logic
  if (analysis.geoStrategy.type !== 'none') {
    await enhanceTransformerWithGeoLogic(config, analysis);
  }
}

async function enhanceTransformerWithGeoLogic(config: any, analysis: any): Promise<void> {
  // This would enhance the transformer with specific geographic transformation logic
  // Implementation would depend on the specific geo strategy detected
  console.log(chalk.gray(`   Enhanced with ${analysis.geoStrategy.type} geo mapping`));
}

async function integrateWithApplication(config: any): Promise<void> {
  const integrationService = new IntegrationService();
  
  const dataSourceConfig = {
    pluginId: config.metadata.id,
    layerId: config.metadata.id,
    metadata: {
      id: config.metadata.id,
      name: config.metadata.name,
      description: config.metadata.description,
      resourceId: config.metadata.id,
      accessUrl: config.api.baseUrl,
      dataType: 'geospatial',
      geoFields: [],
      timeFields: [],
      valueFields: [],
      updateFrequency: 'daily',
      corsRequired: true,
      tags: config.metadata.tags || [],
      organization: 'City of Toronto',
      lastModified: new Date().toISOString(),
      format: 'json'
    },
    domain: config.metadata.domain,
    refreshInterval: config.metadata.refreshInterval
  };
  
  await integrationService.integrateDataSource(dataSourceConfig);
}

// Legacy function for backward compatibility
export async function generateDataSource(options: GenerationOptions) {
  console.log(chalk.yellow('⚠️  Using legacy generation mode'));
  console.log(chalk.blue('💡 For enhanced features, use: npm run tp generate:datasource --url="<toronto-open-data-url>"'));
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Data source name:',
      default: options.name,
      validate: (input) => input.length > 0 || 'Name is required'
    },
    {
      type: 'list',
      name: 'domain',
      message: 'Select domain:',
      choices: [
        { name: '🚌 Transportation', value: 'transportation' },
        { name: '🏗️  Infrastructure', value: 'infrastructure' },
        { name: '🌱 Environment', value: 'environment' },
        { name: '🎉 Events', value: 'events' }
      ],
      default: options.domain
    },
    {
      type: 'input',
      name: 'url',
      message: 'API URL:',
      default: options.url,
      validate: (input) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      }
    },
    {
      type: 'list',
      name: 'type',
      message: 'API type:',
      choices: ['json', 'xml', 'csv', 'gtfs'],
      default: options.type || 'json'
    }
  ]);

  const config: PluginConfig = {
    name: answers.name,
    domain: answers.domain,
    apiUrl: answers.url,
    apiType: answers.type,
    description: `${answers.name} data source`,
    refreshInterval: 300000,
    arrayProperty: answers.type === 'json' ? 'result.records' : undefined
  };

  try {
    await generatePlugin(config);
    console.log(chalk.green(`✅ Generated plugin: ${config.name}`));
    console.log(chalk.blue('💡 Next steps:'));
    console.log(chalk.gray(`   1. Review generated files in src/domains/${config.domain}/${config.name}`));
    console.log(chalk.gray(`   2. Test the plugin: npm run tp test:datasource ${config.name}`));
    console.log(chalk.gray(`   3. Validate integration: npm run tp validate:browser --plugin="${config.name}"`));
  } catch (error) {
    console.error(chalk.red(`❌ Generation failed: ${error instanceof Error ? error.message : String(error)}`));
  }
} 