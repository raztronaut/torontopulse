import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { generatePlugin } from '../generators/plugin-generator.js';
import { PluginConfig } from '../types.js';
import path from 'path';
import fs from 'fs';

interface GenerateDataSourceOptions {
  name: string;
  domain: string;
  url?: string;
  layerId?: string;
  replaceExisting?: boolean;
}

async function integrateWithLayerSystem(options: GenerateDataSourceOptions, pluginId: string) {
  const layerId = options.layerId || kebabCase(options.name);
  
  console.log(`🔗 Integrating plugin "${pluginId}" with layer "${layerId}"...`);
  
  const useDataLayerPath = path.join(process.cwd(), 'src/hooks/useDataLayer.ts');
  if (fs.existsSync(useDataLayerPath)) {
    const content = fs.readFileSync(useDataLayerPath, 'utf-8');
    
    const updatedContent = content.replace(
      /const isPluginSupported = ([^;]+);/,
      `const isPluginSupported = $1 || layerId === '${layerId}';`
    );
    
    const mappingRegex = /case '([^']+)':\s*return '([^']+)';/g;
    const newMapping = `    case '${layerId}':\n      return '${pluginId}';`;
    
    const finalContent = updatedContent.replace(
      /(\s+default:\s*return layerId;)/,
      `\n${newMapping}\n$1`
    );
    
    fs.writeFileSync(useDataLayerPath, finalContent);
    console.log(`✅ Updated useDataLayer.ts with mapping: ${layerId} -> ${pluginId}`);
  }
  
  const loaderPath = path.join(process.cwd(), 'src/core/data-sources/loader.ts');
  if (fs.existsSync(loaderPath)) {
    const content = fs.readFileSync(loaderPath, 'utf-8');
    
    const importPath = `../../domains/${options.domain}/${kebabCase(options.name)}/index.js`;
    const newImport = `      } else if (pluginPath === '${options.domain}/${kebabCase(options.name)}') {\n        module = await import('${importPath}');`;
    
    const updatedContent = content.replace(
      /(\s+} else \{)/,
      `${newImport}\n$1`
    );
    
    const pluginListUpdate = updatedContent.replace(
      /(knownPlugins = \[[\s\S]*?)(];)/,
      `$1      '${options.domain}/${kebabCase(options.name)}',\n    $2`
    );
    
    fs.writeFileSync(loaderPath, pluginListUpdate);
    console.log(`✅ Updated plugin loader with: ${options.domain}/${kebabCase(options.name)}`);
  }
  
  const dataServicePath = path.join(process.cwd(), 'src/services/dataService.ts');
  if (fs.existsSync(dataServicePath)) {
    const content = fs.readFileSync(dataServicePath, 'utf-8');
    const legacyMethodPattern = new RegExp(`fetch${pascalCase(layerId)}|fetch${pascalCase(options.name)}`);
    
    if (legacyMethodPattern.test(content)) {
      console.warn(`⚠️  Legacy implementation detected in dataService.ts`);
      console.warn(`   Consider removing the old fetch method and updating integration tests`);
    }
  }
  
  console.log(`\n🧪 Recommended next steps:`);
  console.log(`   1. Run: npm run tp test:datasource ${pluginId} --validate`);
  console.log(`   2. Run: npm run test -- core/data-sources`);
  console.log(`   3. Test in browser with layer "${layerId}" enabled`);
  console.log(`   4. Verify no legacy API calls in console logs`);
}

export async function generateDataSource(options: GenerateDataSourceOptions) {
  console.log(chalk.blue.bold('🚀 Toronto Pulse Data Source Generator'));
  console.log(chalk.gray('This will create a new data source plugin\n'));

  const questions = [
    {
      type: 'input',
      name: 'name',
      message: 'Data source name:',
      default: options.name,
      validate: (input: string) => {
        if (!input.trim()) return 'Data source name is required';
        return true;
      }
    },
    {
      type: 'list',
      name: 'domain',
      message: 'Select domain:',
      choices: [
        { name: '🚌 Transportation (buses, bikes, transit)', value: 'transportation' },
        { name: '🏗️ Infrastructure (roads, utilities, construction)', value: 'infrastructure' },
        { name: '🌱 Environment (air quality, beaches, parks)', value: 'environment' },
        { name: '🎉 Events (festivals, closures, emergencies)', value: 'events' }
      ],
      default: options.domain
    },
    {
      type: 'input',
      name: 'description',
      message: 'Brief description:',
      default: (answers: any) => `${answers.name} data source for Toronto Pulse`
    },
    {
      type: 'input',
      name: 'apiUrl',
      message: 'API URL:',
      default: options.url,
      validate: (input: string) => {
        if (!input.trim()) return 'API URL is required';
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
      name: 'apiType',
      message: 'API type:',
      choices: [
        { name: 'JSON (REST API)', value: 'json' },
        { name: 'XML (SOAP/RSS)', value: 'xml' },
        { name: 'CSV (Comma Separated)', value: 'csv' },
        { name: 'GTFS (Transit Format)', value: 'gtfs' }
      ],
      default: options.type
    },
    {
      type: 'number',
      name: 'refreshInterval',
      message: 'Refresh interval (seconds):',
      default: 60,
      validate: (input: number) => {
        if (input < 1) return 'Refresh interval must be at least 1 second';
        return true;
      },
      filter: (input: number) => input * 1000
    },
    {
      type: 'list',
      name: 'reliability',
      message: 'Expected reliability:',
      choices: [
        { name: 'High (99%+ uptime, official APIs)', value: 'high' },
        { name: 'Medium (95%+ uptime, semi-official)', value: 'medium' },
        { name: 'Low (<95% uptime, experimental)', value: 'low' }
      ],
      default: 'medium'
    },
    {
      type: 'input',
      name: 'tags',
      message: 'Tags (comma-separated):',
      default: (answers: any) => `${answers.domain}, toronto, real-time`,
      filter: (input: string) => input.split(',').map(tag => tag.trim())
    },
    {
      type: 'confirm',
      name: 'includeTests',
      message: 'Generate test files?',
      default: true
    },
    {
      type: 'input',
      name: 'layerId',
      message: 'Layer ID:',
      default: options.layerId,
      validate: (input: string) => {
        if (!input.trim()) return 'Layer ID is required';
        return true;
      }
    },
    {
      type: 'confirm',
      name: 'replaceExisting',
      message: 'Replace existing implementation?',
      default: false
    }
  ];

  const answers = await inquirer.prompt(questions as any);

  // After collecting apiUrl and apiType, attempt to fetch a sample response and infer schema
  let inferredArrayProperty: string | undefined = undefined;
  let sampleResponse: any = undefined;
  try {
    if (answers.apiType === 'json' && answers.apiUrl) {
      const res = await fetch(answers.apiUrl, { headers: { 'Accept': 'application/json' } });
      sampleResponse = await res.json();
      if (Array.isArray(sampleResponse)) {
        inferredArrayProperty = undefined;
      } else if (typeof sampleResponse === 'object') {
        const arrayKey = Object.keys(sampleResponse).find(key => Array.isArray(sampleResponse[key]));
        if (arrayKey) inferredArrayProperty = arrayKey;
      }
    }
  } catch (err) {
    console.warn(chalk.yellow('⚠️  Could not fetch sample API response for schema inference.')); 
  }

  if (inferredArrayProperty === undefined && sampleResponse && typeof sampleResponse === 'object' && !Array.isArray(sampleResponse)) {
    // Prompt for property name if not inferred
    const { arrayProperty } = await inquirer.prompt([
      { type: 'input', name: 'arrayProperty', message: 'If the data is nested, what is the property name containing the array? (Leave blank if direct array)' }
    ]);
    inferredArrayProperty = arrayProperty || undefined;
  }

  if (sampleResponse) {
    console.log(chalk.cyan('🔎 Sample API response structure:'));
    if (Array.isArray(sampleResponse)) {
      console.log(chalk.gray('Top-level array of items.'));
    } else if (typeof sampleResponse === 'object') {
      console.log(chalk.gray('Top-level object with keys:'), Object.keys(sampleResponse));
      if (inferredArrayProperty) {
        console.log(chalk.gray('Array property inferred:'), inferredArrayProperty);
      }
    }
  }

  // Pass inferredArrayProperty to plugin-generator
  const config: PluginConfig = {
    name: answers.name,
    domain: answers.domain,
    description: answers.description,
    apiUrl: answers.apiUrl,
    apiType: answers.apiType,
    refreshInterval: answers.refreshInterval,
    reliability: answers.reliability,
    tags: answers.tags,
    author: 'Toronto Pulse Team',
    dataLicense: 'Open Government License - Ontario',
    includeTests: answers.includeTests,
    arrayProperty: inferredArrayProperty,
    sampleResponse
  };

  const spinner = ora('Generating data source plugin...').start();

  try {
    await generatePlugin(config);
    spinner.succeed(chalk.green('✅ Data source plugin generated successfully!'));
    
    console.log('\n' + chalk.blue.bold('📁 What was created:'));
    console.log(chalk.gray(`   Plugin directory: src/domains/${config.domain}/${kebabCase(config.name)}`));
    console.log(chalk.gray('   Files: config.json, fetcher.ts, transformer.ts, validator.ts, index.ts'));
    if (config.includeTests) {
      console.log(chalk.gray('   Tests: test.spec.ts'));
    }
    
    console.log('\n' + chalk.blue.bold('🧪 Next steps:'));
    console.log(chalk.yellow(`   1. Implement the plugin logic in the generated files`));
    console.log(chalk.yellow(`   2. Test your plugin: npm run tp test:datasource ${kebabCase(config.name)}`));
    console.log(chalk.yellow(`   3. Register the plugin in your application`));
    
    if (answers.layerId !== false) {
      await integrateWithLayerSystem(options, kebabCase(config.name));
    }
    
    console.log(`\n✅ Data source plugin "${kebabCase(config.name)}" generated and integrated successfully!`);
  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to generate plugin'));
    console.error(chalk.red(error));
    process.exit(1);
  }
}

function kebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function pascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
} 