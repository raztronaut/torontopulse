import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { CkanApiService } from '../services/CkanApiService.js';
import { ProxyConfigService } from '../services/ProxyConfigService.js';
import { GeoMappingService } from '../services/GeoMappingService.js';
import { IntegrationService } from '../services/IntegrationService.js';
import { generatePlugin } from '../generators/plugin-generator.js';
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

export class ProgressTracker {
  private steps: ProgressStep[] = [];

  addStep(name: string, description: string): void {
    this.steps.push({ name, description, status: 'pending' });
  }

  startStep(name: string): void {
    const step = this.steps.find(s => s.name === name);
    if (step) {
      step.status = 'running';
      this.render();
    }
  }

  completeStep(name: string, message?: string): void {
    const step = this.steps.find(s => s.name === name);
    if (step) {
      step.status = 'completed';
      step.message = message;
      this.render();
    }
  }

  failStep(name: string, message: string): void {
    const step = this.steps.find(s => s.name === name);
    if (step) {
      step.status = 'failed';
      step.message = message;
      this.render();
    }
  }

  private render(): void {
    console.clear();
    console.log(chalk.blue.bold('🚀 Toronto Pulse Data Integration\n'));
    
    this.steps.forEach(step => {
      const icon = step.status === 'completed' ? '✅' : 
                   step.status === 'running' ? '⏳' : 
                   step.status === 'failed' ? '❌' : '⏸️';
      console.log(`${icon} ${step.description}`);
      if (step.message) {
        console.log(`   ${step.message}`);
      }
    });
  }
}

export async function generateDataSourceEnhanced(options: EnhancedGenerateOptions): Promise<void> {
  const tracker = new ProgressTracker();
  
  // Setup progress tracking
  tracker.addStep('discovery', 'Discovering dataset information');
  tracker.addStep('analysis', 'Analyzing data structure and fields');
  tracker.addStep('configuration', 'Configuring plugin settings');
  tracker.addStep('generation', 'Generating plugin files');
  tracker.addStep('integration', 'Integrating with application');
  tracker.addStep('validation', 'Validating integration');

  try {
    let metadata: DatasetMetadata;
    
    if (options.url) {
      // Automatic discovery mode
      metadata = await discoverFromUrl(options.url, tracker);
    } else {
      // Interactive mode
      metadata = await interactiveDiscovery(options, tracker);
    }

    // Analyze data structure and generate configuration
    tracker.startStep('analysis');
    const analysisResult = await analyzeDataStructure(metadata, tracker);
    tracker.completeStep('analysis', `Detected ${analysisResult.geoStrategy.type} geographic data`);

    // Configure plugin settings
    tracker.startStep('configuration');
    const pluginConfig = await configurePlugin(metadata, analysisResult, options, tracker);
    tracker.completeStep('configuration', `Plugin "${pluginConfig.name}" configured`);

    // Generate plugin files
    tracker.startStep('generation');
    await generateEnhancedPlugin(pluginConfig, analysisResult, tracker);
    tracker.completeStep('generation', 'Plugin files generated successfully');

    // Integration with application
    if (options.autoIntegrate !== false) {
      tracker.startStep('integration');
      const integrationResult = await integratePlugin(pluginConfig, metadata, tracker);
      tracker.completeStep('integration', `Integrated with ${integrationResult.filesModified.length} files`);

      // Validation
      tracker.startStep('validation');
      await validateIntegration(pluginConfig, tracker);
      tracker.completeStep('validation', 'Integration validated successfully');
    }

    // Final success message
    console.log('\n' + chalk.green.bold('✅ Data source integration completed successfully!'));
    console.log('\n' + chalk.blue.bold('🧪 Next steps:'));
    console.log(chalk.yellow(`   1. Test your plugin: npm run tp test:datasource ${kebabCase(pluginConfig.name)}`));
    console.log(chalk.yellow(`   2. Verify integration: npm run tp verify:integration --plugin="${kebabCase(pluginConfig.name)}"`));
    console.log(chalk.yellow(`   3. Start development server: npm run dev`));
    console.log(chalk.yellow(`   4. Enable layer "${options.layerId || kebabCase(pluginConfig.name)}" in the dashboard`));

  } catch (error) {
    console.error('\n' + chalk.red.bold('❌ Integration failed:'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

async function discoverFromUrl(url: string, tracker: ProgressTracker): Promise<DatasetMetadata> {
  tracker.startStep('discovery');
  
  const ckanService = new CkanApiService();
  
  try {
    const metadata = await ckanService.discoverDataset(url);
    tracker.completeStep('discovery', `Discovered "${metadata.name}" with ${metadata.valueFields.length} fields`);
    return metadata;
  } catch (error) {
    tracker.failStep('discovery', `Failed to discover dataset: ${error}`);
    throw error;
  }
}

async function interactiveDiscovery(options: EnhancedGenerateOptions, tracker: ProgressTracker): Promise<DatasetMetadata> {
  tracker.startStep('discovery');
  
  const questions = [
    {
      type: 'input',
      name: 'url',
      message: 'Toronto Open Data URL:',
      validate: (input: string) => {
        if (!input.trim()) return 'URL is required';
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      }
    }
  ];

  const answers = await inquirer.prompt(questions);
  return discoverFromUrl(answers.url, tracker);
}

async function analyzeDataStructure(metadata: DatasetMetadata, tracker: ProgressTracker) {
  const geoService = new GeoMappingService();
  
  // Detect geographic strategy
  const geoStrategy = await geoService.detectGeographicData(metadata.valueFields);
  
  // Generate coordinate mapping if needed
  let coordinateMapping;
  if (geoStrategy.type === 'location-name' && geoStrategy.locationField) {
    const sampleValues = metadata.valueFields
      .find(f => f.name === geoStrategy.locationField)
      ?.sampleValues?.map(v => String(v)) || [];
    
    if (sampleValues.length > 0) {
      coordinateMapping = await geoService.generateCoordinateMapping(
        geoStrategy.locationField,
        sampleValues
      );
    }
  }

  return {
    geoStrategy,
    coordinateMapping,
    dataComplexity: calculateDataComplexity(metadata),
    recommendedRefreshInterval: calculateRefreshInterval(metadata.updateFrequency)
  };
}

async function configurePlugin(
  metadata: DatasetMetadata, 
  analysis: any, 
  options: EnhancedGenerateOptions,
  tracker: ProgressTracker
): Promise<PluginConfig> {
  
  // Auto-configure based on analysis
  const config: PluginConfig = {
    name: options.name || metadata.name,
    domain: options.domain as any || inferDomain(metadata),
    description: metadata.description,
    apiUrl: metadata.accessUrl,
    apiType: metadata.format as any || 'json',
    refreshInterval: analysis.recommendedRefreshInterval,
    reliability: inferReliability(metadata),
    tags: metadata.tags,
    author: 'Toronto Pulse Team',
    dataLicense: 'Open Government License - Ontario',
    includeTests: true,
    arrayProperty: inferArrayProperty(metadata)
  };

  // Interactive refinement if not in auto mode
  if (!options.autoIntegrate) {
    const refinementQuestions = [
      {
        type: 'input',
        name: 'name',
        message: 'Plugin name:',
        default: config.name
      },
      {
        type: 'list',
        name: 'domain',
        message: 'Domain:',
        choices: [
          { name: '🚌 Transportation', value: 'transportation' },
          { name: '🏗️ Infrastructure', value: 'infrastructure' },
          { name: '🌱 Environment', value: 'environment' },
          { name: '🎉 Events', value: 'events' }
        ],
        default: config.domain
      },
      {
        type: 'number',
        name: 'refreshInterval',
        message: 'Refresh interval (seconds):',
        default: config.refreshInterval / 1000,
        filter: (input: number) => input * 1000
      }
    ];

    const refinements = await inquirer.prompt(refinementQuestions);
    Object.assign(config, refinements);
  }

  return config;
}

async function generateEnhancedPlugin(
  config: PluginConfig, 
  analysis: any, 
  tracker: ProgressTracker
): Promise<void> {
  
  // Configure CORS proxy if needed
  if (analysis.corsRequired) {
    const proxyService = new ProxyConfigService();
    await proxyService.addProxyForUrl(config.apiUrl);
  }

  // Generate plugin with enhanced transformers
  await generatePlugin(config);

  // Enhance transformer with geographic logic
  if (analysis.geoStrategy.type !== 'none') {
    await enhanceTransformerWithGeoLogic(config, analysis);
  }
}

async function enhanceTransformerWithGeoLogic(config: PluginConfig, analysis: any): Promise<void> {
  const geoService = new GeoMappingService();
  const transformerPath = `src/domains/${config.domain}/${kebabCase(config.name)}/transformer.ts`;
  
  // Read existing transformer
  const fs = await import('fs-extra');
  const content = await fs.readFile(transformerPath, 'utf-8');
  
  // Generate geographic transformation code
  const geoCode = geoService.generateGeoTransformCode(analysis.geoStrategy, analysis.coordinateMapping);
  
  // Replace the coordinate extraction logic
  const enhancedContent = content.replace(
    /coordinates: \[\s*item\.longitude[^}]+\}/,
    `coordinates: this.extractCoordinates(item)`
  ).replace(
    /private createFeature\(item: any\): GeoJSONFeature \{/,
    `private extractCoordinates(item: any): [number, number] | null {${geoCode}
  }

  private createFeature(item: any): GeoJSONFeature | null {
    const coordinates = this.extractCoordinates(item);
    if (!coordinates) return null;`
  ).replace(
    /geometry: \{[^}]+\}/,
    `geometry: {
        type: 'Point',
        coordinates
      }`
  );

  await fs.writeFile(transformerPath, enhancedContent);
}

async function integratePlugin(
  config: PluginConfig, 
  metadata: DatasetMetadata, 
  tracker: ProgressTracker
): Promise<IntegrationResult> {
  
  const integrationService = new IntegrationService();
  const pluginId = kebabCase(config.name);
  const layerId = kebabCase(config.name); // Could be customized
  
  const integrationConfig = {
    pluginId,
    layerId,
    metadata,
    domain: config.domain,
    refreshInterval: config.refreshInterval
  };

  await integrationService.integrateDataSource(integrationConfig);

  return {
    success: true,
    pluginId,
    layerId,
    filesCreated: [
      `src/domains/${config.domain}/${pluginId}/`,
      `src/config/layers/${layerId}.ts`
    ],
    filesModified: [
      'src/hooks/useDataLayer.ts',
      'src/core/data-sources/loader.ts'
    ],
    warnings: [],
    errors: [],
    nextSteps: [
      'Test the plugin',
      'Verify integration',
      'Enable layer in dashboard'
    ]
  };
}

async function validateIntegration(config: PluginConfig, tracker: ProgressTracker): Promise<void> {
  // Basic validation - could be enhanced with actual testing
  const pluginId = kebabCase(config.name);
  
  // Check if files exist
  const fs = await import('fs-extra');
  const pluginPath = `src/domains/${config.domain}/${pluginId}`;
  
  if (!await fs.pathExists(pluginPath)) {
    throw new Error(`Plugin directory not found: ${pluginPath}`);
  }

  const requiredFiles = ['index.ts', 'fetcher.ts', 'transformer.ts', 'validator.ts', 'config.json'];
  for (const file of requiredFiles) {
    if (!await fs.pathExists(`${pluginPath}/${file}`)) {
      throw new Error(`Required file missing: ${file}`);
    }
  }
}

// Helper functions

function kebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferDomain(metadata: DatasetMetadata): string {
  const name = metadata.name.toLowerCase();
  const description = metadata.description.toLowerCase();
  const text = `${name} ${description}`;

  if (/transit|ttc|bus|subway|streetcar|bike|transport/i.test(text)) return 'transportation';
  if (/road|infrastructure|construction|utility|signal/i.test(text)) return 'infrastructure';
  if (/beach|water|air|environment|quality|weather/i.test(text)) return 'environment';
  if (/event|festival|closure|emergency/i.test(text)) return 'events';

  return 'infrastructure'; // Default
}

function inferReliability(metadata: DatasetMetadata): 'high' | 'medium' | 'low' {
  if (metadata.organization.includes('City of Toronto')) return 'high';
  if (metadata.updateFrequency === 'real-time') return 'high';
  if (metadata.format === 'json') return 'medium';
  return 'low';
}

function inferArrayProperty(metadata: DatasetMetadata): string | undefined {
  // Common patterns in Toronto Open Data
  if (metadata.accessUrl.includes('datastore_search')) {
    return 'result.records';
  }
  return undefined;
}

function calculateDataComplexity(metadata: DatasetMetadata): 'simple' | 'medium' | 'complex' {
  const fieldCount = metadata.valueFields.length;
  const hasGeo = metadata.geoFields.length > 0;
  const hasTemporal = metadata.timeFields.length > 0;

  if (fieldCount > 20 || (hasGeo && hasTemporal)) return 'complex';
  if (fieldCount > 10 || hasGeo || hasTemporal) return 'medium';
  return 'simple';
}

function calculateRefreshInterval(updateFrequency: string): number {
  switch (updateFrequency) {
    case 'real-time': return 30000; // 30 seconds
    case 'daily': return 3600000; // 1 hour
    case 'weekly': return 86400000; // 24 hours
    case 'monthly': return 604800000; // 1 week
    default: return 300000; // 5 minutes
  }
} 