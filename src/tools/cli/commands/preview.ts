import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { CkanApiService } from '../services/CkanApiService.js';
import { FieldAnalysisService } from '../services/FieldAnalysisService.js';
import { GeoMappingService } from '../services/GeoMappingService.js';
import { TorontoDataService } from '../services/TorontoDataService.js';
import { PopupGeneratorService } from '../services/PopupGeneratorService.js';
import { ColorCodingService } from '../services/ColorCodingService.js';
import { DatasetMetadata } from '../types.js';

interface PreviewOptions {
  url?: string;
  interactive?: boolean;
  format?: 'table' | 'json' | 'summary';
  sample?: number;
}

export async function previewDataset(options: PreviewOptions): Promise<void> {
  console.log(chalk.blue.bold('🔍 Toronto Pulse Dataset Preview\n'));

  try {
    let url = options.url;
    
    if (!url) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'url',
          message: 'Enter Toronto Open Data URL to preview:',
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
      ]);
      url = answers.url;
    }

    // Discover dataset
    const spinner = ora('Discovering dataset...').start();
    const ckanService = new CkanApiService();
    const metadata = await ckanService.discoverDataset(url!);
    spinner.succeed(`Discovered: ${metadata.name}`);

    // Analyze data structure
    spinner.start('Analyzing data structure...');
    const fieldAnalysis = new FieldAnalysisService();
    const enhancedFields = fieldAnalysis.analyzeFields(
      metadata.valueFields.map(f => ({ [f.name]: f.sampleValues?.[0] }))
    );
    spinner.succeed('Data structure analyzed');

    // Detect geographic patterns
    spinner.start('Detecting geographic patterns...');
    const geoService = new GeoMappingService();
    const geoStrategy = await geoService.detectGeographicData(enhancedFields);
    spinner.succeed(`Geographic strategy: ${geoStrategy.type}`);

    // Recognize Toronto patterns
    spinner.start('Recognizing Toronto-specific patterns...');
    const torontoService = new TorontoDataService();
    const torontoPatterns = torontoService.recognizeTorontoPatterns({
      ...metadata,
      valueFields: enhancedFields
    });
    spinner.succeed('Toronto patterns analyzed');

    // Display preview
    console.log('\n' + chalk.green.bold('📊 Dataset Preview'));
    console.log('═'.repeat(60));

    displayBasicInfo(metadata);
    displayFieldAnalysis(enhancedFields);
    displayGeographicInfo(geoStrategy);
    displayTorontoPatterns(torontoPatterns);

    if (options.interactive !== false) {
      await showInteractiveOptions(metadata, enhancedFields, geoStrategy, torontoPatterns);
    }

  } catch (error) {
    console.error('\n' + chalk.red.bold('❌ Preview failed:'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

function displayBasicInfo(metadata: DatasetMetadata): void {
  console.log('\n' + chalk.cyan.bold('📋 Basic Information'));
  console.log(`Name: ${chalk.white(metadata.name)}`);
  console.log(`Description: ${chalk.gray(metadata.description)}`);
  console.log(`Data Type: ${chalk.yellow(metadata.dataType)}`);
  console.log(`Update Frequency: ${chalk.yellow(metadata.updateFrequency)}`);
  console.log(`Organization: ${chalk.yellow(metadata.organization)}`);
  console.log(`Last Modified: ${chalk.yellow(metadata.lastModified)}`);
  console.log(`Format: ${chalk.yellow(metadata.format)}`);
  console.log(`CORS Required: ${metadata.corsRequired ? chalk.red('Yes') : chalk.green('No')}`);
  
  if (metadata.tags.length > 0) {
    console.log(`Tags: ${metadata.tags.map(tag => chalk.blue(tag)).join(', ')}`);
  }
}

function displayFieldAnalysis(fields: any[]): void {
  console.log('\n' + chalk.cyan.bold('🔍 Field Analysis'));
  
  const table = fields.map(field => ({
    Name: field.name,
    Type: field.type,
    Semantic: field.semanticType,
    Format: field.format,
    Nullable: field.nullable ? '✓' : '✗',
    Samples: field.sampleValues?.slice(0, 2).join(', ') || 'N/A'
  }));

  console.table(table);
}

function displayGeographicInfo(geoStrategy: any): void {
  console.log('\n' + chalk.cyan.bold('🗺️  Geographic Information'));
  console.log(`Strategy: ${chalk.yellow(geoStrategy.type)}`);
  
  if (geoStrategy.latField && geoStrategy.lonField) {
    console.log(`Coordinates: ${chalk.green(geoStrategy.latField)} / ${chalk.green(geoStrategy.lonField)}`);
  }
  
  if (geoStrategy.addressField) {
    console.log(`Address Field: ${chalk.green(geoStrategy.addressField)}`);
  }
  
  if (geoStrategy.locationField) {
    console.log(`Location Field: ${chalk.green(geoStrategy.locationField)}`);
  }
}

function displayTorontoPatterns(patterns: any): void {
  console.log('\n' + chalk.cyan.bold('🍁 Toronto-Specific Patterns'));
  
  const detectedPatterns = Object.entries(patterns)
    .filter(([_, pattern]) => pattern !== null)
    .map(([type, pattern]: [string, any]) => ({
      Type: type.charAt(0).toUpperCase() + type.slice(1),
      Pattern: pattern.type,
      Details: getPatternDetails(pattern)
    }));

  if (detectedPatterns.length > 0) {
    console.table(detectedPatterns);
  } else {
    console.log(chalk.gray('No specific Toronto patterns detected'));
  }
}

function getPatternDetails(pattern: any): string {
  if (!pattern) return 'N/A';
  
  switch (pattern.type) {
    case 'beach-observations':
      return `Temp: ${pattern.temperatureFields.join(', ')}, Quality: ${pattern.qualityFields.join(', ')}`;
    case 'transit-vehicles':
      return `Route: ${pattern.routeField}, Coords: ${pattern.coordinateFields.join('/')}`;
    case 'neighborhood-data':
      return `Name: ${pattern.nameField}`;
    case 'infrastructure-data':
      return `Status: ${pattern.statusField}, Type: ${pattern.typeField}`;
    case 'event-data':
      return `Start: ${pattern.startDateField}, Category: ${pattern.categoryField}`;
    default:
      return 'Generic pattern';
  }
}

async function showInteractiveOptions(
  metadata: DatasetMetadata, 
  fields: any[], 
  geoStrategy: any, 
  patterns: any
): Promise<void> {
  console.log('\n' + chalk.blue.bold('🎛️  Interactive Options'));
  
  const choices = [
    'Generate popup preview',
    'Show color scheme preview',
    'View integration recommendations',
    'Generate plugin configuration',
    'Exit preview'
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices
    }
  ]);

  switch (action) {
    case 'Generate popup preview':
      await showPopupPreview(metadata, fields);
      break;
    case 'Show color scheme preview':
      await showColorSchemePreview(fields);
      break;
    case 'View integration recommendations':
      await showIntegrationRecommendations(metadata, patterns);
      break;
    case 'Generate plugin configuration':
      await showPluginConfiguration(metadata, geoStrategy, patterns);
      break;
    case 'Exit preview':
      return;
  }

  // Ask if they want to continue
  const { continue: shouldContinue } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'continue',
      message: 'Continue with more options?',
      default: true
    }
  ]);

  if (shouldContinue) {
    await showInteractiveOptions(metadata, fields, geoStrategy, patterns);
  }
}

async function showPopupPreview(metadata: DatasetMetadata, fields: any[]): Promise<void> {
  console.log('\n' + chalk.green.bold('🎨 Popup Preview'));
  
  const popupService = new PopupGeneratorService();
  const template = popupService.generatePopupTemplate({
    name: metadata.name,
    valueFields: fields
  });

  console.log(`Layout: ${chalk.yellow(template.layout)}`);
  console.log(`Fields: ${template.fields.length}`);
  console.log(`Color Coding: ${template.styling.colorCoding ? chalk.green('Enabled') : chalk.gray('Disabled')}`);
  console.log(`Responsive: ${template.styling.responsive ? chalk.green('Yes') : chalk.gray('No')}`);

  console.log('\n' + chalk.cyan('Fields in popup:'));
  template.fields.forEach(field => {
    const colorCoding = field.colorCoding ? chalk.green('🎨') : '';
    const unit = field.unit ? chalk.gray(`(${field.unit})`) : '';
    console.log(`  • ${field.label} ${unit} ${colorCoding}`);
  });

  const htmlTemplate = popupService.generateHTMLTemplate(template);
  console.log('\n' + chalk.cyan('HTML Template Preview:'));
  console.log(chalk.gray(htmlTemplate.substring(0, 200) + '...'));
}

async function showColorSchemePreview(fields: any[]): Promise<void> {
  console.log('\n' + chalk.green.bold('🌈 Color Scheme Preview'));
  
  const colorService = new ColorCodingService();
  
  const colorableFields = fields.filter(field => 
    ['temperature', 'quality', 'status', 'quantity'].includes(field.semanticType)
  );

  if (colorableFields.length === 0) {
    console.log(chalk.gray('No fields suitable for color coding found'));
    return;
  }

  colorableFields.forEach(field => {
    const scheme = colorService.generateColorScheme(field);
    console.log(`\n${chalk.cyan(field.name)} (${field.semanticType}):`);
    console.log(`  Type: ${chalk.yellow(scheme.type)}`);
    console.log(`  Colors: ${scheme.colors.length}`);
    
    if (scheme.labels) {
      scheme.labels.forEach((label, index) => {
        const color = scheme.colors[index];
        console.log(`    ${chalk.hex(color)('●')} ${label}`);
      });
    }
  });
}

async function showIntegrationRecommendations(metadata: DatasetMetadata, patterns: any): Promise<void> {
  console.log('\n' + chalk.green.bold('💡 Integration Recommendations'));
  
  const torontoService = new TorontoDataService();
  const enhancements = torontoService.getTorontoEnhancements(patterns);
  const refreshInterval = torontoService.getRecommendedRefreshInterval(patterns);

  console.log(`Recommended refresh interval: ${chalk.yellow(formatInterval(refreshInterval))}`);
  
  if (enhancements.length > 0) {
    console.log('\nSuggested enhancements:');
    enhancements.forEach(enhancement => {
      console.log(`\n${chalk.cyan(enhancement.type)}:`);
      console.log(`  ${enhancement.suggestion}`);
      console.log(`  ${chalk.gray('Implementation:')} ${enhancement.implementation}`);
    });
  }

  // Domain-specific recommendations
  const domain = inferDomain(metadata);
  console.log(`\nRecommended domain: ${chalk.yellow(domain)}`);
  
  const reliability = inferReliability(metadata);
  console.log(`Estimated reliability: ${chalk.yellow(reliability)}`);
}

async function showPluginConfiguration(metadata: DatasetMetadata, geoStrategy: any, patterns: any): Promise<void> {
  console.log('\n' + chalk.green.bold('⚙️  Plugin Configuration Preview'));
  
  const config = {
    name: metadata.name.replace(/[^a-zA-Z0-9]/g, ''),
    domain: inferDomain(metadata),
    description: metadata.description,
    apiUrl: metadata.accessUrl,
    apiType: 'json' as const,
    refreshInterval: new TorontoDataService().getRecommendedRefreshInterval(patterns),
    reliability: inferReliability(metadata),
    tags: metadata.tags,
    geoStrategy: geoStrategy.type,
    torontoPatterns: Object.keys(patterns).filter(key => patterns[key] !== null)
  };

  console.log(JSON.stringify(config, null, 2));

  const { generate } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'generate',
      message: 'Generate plugin with this configuration?',
      default: false
    }
  ]);

  if (generate) {
    console.log(chalk.green('\n✨ Run the following command to generate the plugin:'));
    console.log(chalk.yellow(`npm run tp generate:datasource --url="${metadata.accessUrl}" --auto-integrate`));
  }
}

function formatInterval(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

function inferDomain(metadata: DatasetMetadata): string {
  const name = metadata.name.toLowerCase();
  const desc = metadata.description.toLowerCase();
  const text = name + ' ' + desc;

  if (/beach|water|environment|air|quality|pollution/.test(text)) return 'environment';
  if (/ttc|transit|bus|subway|transport|traffic|road/.test(text)) return 'transportation';
  if (/event|festival|program|activity|recreation/.test(text)) return 'events';
  if (/infrastructure|facility|building|construction|park/.test(text)) return 'infrastructure';
  
  return 'infrastructure'; // Default
}

function inferReliability(metadata: DatasetMetadata): 'high' | 'medium' | 'low' {
  const updateFreq = metadata.updateFrequency.toLowerCase();
  
  if (/real.?time|minute|hour/.test(updateFreq)) return 'high';
  if (/daily|week/.test(updateFreq)) return 'medium';
  return 'low';
} 