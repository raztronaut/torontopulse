import chalk from 'chalk';
// import ora from 'ora'; // Unused for now
import path from 'path';
import fs from 'fs-extra';
import { ValidationResult } from '../types.js';

export async function validateAll(options: any): Promise<void> {
  console.log(chalk.blue.bold('🔍 Validating All Data Sources'));
  console.log(chalk.gray('Scanning for data source plugins...\n'));

  const plugins = await discoverPlugins();
  
  if (plugins.length === 0) {
    console.log(chalk.yellow('⚠️  No data source plugins found'));
    return;
  }

  console.log(chalk.green(`Found ${plugins.length} data source plugins\n`));

  const results: Array<{
    plugin: string;
    path: string;
    results: ValidationResult[];
  }> = [];

  for (const plugin of plugins) {
    console.log(chalk.blue(`\n📦 Validating: ${plugin.name}`));
    
    const validationResults = await validatePlugin(plugin);
    results.push({
      plugin: plugin.name,
      path: plugin.path,
      results: validationResults
    });
  }

  printValidationSummary(results, options.fix);
}

async function discoverPlugins(): Promise<Array<{ name: string; path: string; domain: string }>> {
  const plugins: Array<{ name: string; path: string; domain: string }> = [];
  const domains = ['transportation', 'infrastructure', 'environment', 'events'];

  for (const domain of domains) {
    const domainPath = path.join('src', 'domains', domain);
    
    if (!await fs.pathExists(domainPath)) {
      continue;
    }

    const items = await fs.readdir(domainPath);
    
    for (const item of items) {
      const itemPath = path.join(domainPath, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory()) {
        // Check if it's a valid plugin directory
        const configPath = path.join(itemPath, 'config.json');
        const indexPath = path.join(itemPath, 'index.ts');
        
        if (await fs.pathExists(configPath) && await fs.pathExists(indexPath)) {
          plugins.push({
            name: item,
            path: itemPath,
            domain
          });
        }
      }
    }
  }

  return plugins;
}

async function validatePlugin(plugin: { name: string; path: string; domain: string }): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Validate file structure
  results.push(await validateFileStructure(plugin));

  // Validate config.json
  results.push(await validateConfig(plugin));

  // Validate TypeScript files
  results.push(await validateTypeScriptFiles(plugin));

  // Validate plugin class
  results.push(await validatePluginClass(plugin));

  return results;
}

async function validateFileStructure(plugin: { name: string; path: string }): Promise<ValidationResult> {
  const requiredFiles = [
    'config.json',
    'index.ts',
    'fetcher.ts',
    'transformer.ts',
    'validator.ts'
  ];

  const optionalFiles = [
    'test.spec.ts',
    'README.md'
  ];

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required files
  for (const file of requiredFiles) {
    const filePath = path.join(plugin.path, file);
    if (!await fs.pathExists(filePath)) {
      errors.push(`Missing required file: ${file}`);
    }
  }

  // Check optional files
  for (const file of optionalFiles) {
    const filePath = path.join(plugin.path, file);
    if (!await fs.pathExists(filePath)) {
      warnings.push(`Missing optional file: ${file}`);
    }
  }

  // Check for unexpected files
  const allFiles = await fs.readdir(plugin.path);
  const expectedFiles = [...requiredFiles, ...optionalFiles];
  
  for (const file of allFiles) {
    const filePath = path.join(plugin.path, file);
    const stat = await fs.stat(filePath);
    
    if (stat.isFile() && !expectedFiles.includes(file)) {
      warnings.push(`Unexpected file: ${file}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

async function validateConfig(plugin: { name: string; path: string }): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const configPath = path.join(plugin.path, 'config.json');
    
    if (!await fs.pathExists(configPath)) {
      errors.push('config.json not found');
      return { valid: false, errors, warnings };
    }

    const configContent = await fs.readJSON(configPath);

    // Validate metadata section
    if (!configContent.metadata) {
      errors.push('Missing metadata section');
    } else {
      const metadata = configContent.metadata;
      
      if (!metadata.id) errors.push('Missing metadata.id');
      if (!metadata.name) errors.push('Missing metadata.name');
      if (!metadata.domain) errors.push('Missing metadata.domain');
      if (!metadata.version) errors.push('Missing metadata.version');
      if (!metadata.description) warnings.push('Missing metadata.description');
      if (!metadata.author) warnings.push('Missing metadata.author');
      
      // Validate domain
      const validDomains = ['transportation', 'infrastructure', 'environment', 'events'];
      if (metadata.domain && !validDomains.includes(metadata.domain)) {
        errors.push(`Invalid domain: ${metadata.domain}`);
      }

      // Validate refresh interval
      if (typeof metadata.refreshInterval !== 'number') {
        errors.push('refreshInterval must be a number');
      } else if (metadata.refreshInterval < 1000) {
        warnings.push('refreshInterval less than 1000ms may cause API rate limiting');
      }

      // Validate reliability
      const validReliability = ['high', 'medium', 'low'];
      if (metadata.reliability && !validReliability.includes(metadata.reliability)) {
        warnings.push(`Invalid reliability: ${metadata.reliability}`);
      }
    }

    // Validate API section
    if (!configContent.api) {
      errors.push('Missing api section');
    } else {
      const api = configContent.api;
      
      if (!api.type) errors.push('Missing api.type');
      if (!api.baseUrl) errors.push('Missing api.baseUrl');
      
      // Validate API type
      const validTypes = ['json', 'xml', 'csv', 'gtfs', 'custom'];
      if (api.type && !validTypes.includes(api.type)) {
        warnings.push(`Uncommon API type: ${api.type}`);
      }

      // Validate URL format
      if (api.baseUrl) {
        try {
          new URL(api.baseUrl);
        } catch {
          errors.push('Invalid baseUrl format');
        }
      }
    }

    // Validate transform section
    if (!configContent.transform) {
      warnings.push('Missing transform section');
    } else {
      const transform = configContent.transform;
      if (!transform.strategy) warnings.push('Missing transform.strategy');
      if (!transform.mappings) warnings.push('Missing transform.mappings');
    }

    // Validate visualization section
    if (!configContent.visualization) {
      warnings.push('Missing visualization section');
    }

    // Validate cache section
    if (!configContent.cache) {
      warnings.push('Missing cache section');
    } else {
      const cache = configContent.cache;
      if (!cache.strategy) warnings.push('Missing cache.strategy');
      if (typeof cache.ttl !== 'number') warnings.push('cache.ttl should be a number');
    }

  } catch (error) {
    errors.push(`Failed to parse config.json: ${error}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

async function validateTypeScriptFiles(plugin: { name: string; path: string }): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const tsFiles = ['index.ts', 'fetcher.ts', 'transformer.ts', 'validator.ts'];

  for (const file of tsFiles) {
    const filePath = path.join(plugin.path, file);
    
    if (!await fs.pathExists(filePath)) {
      continue; // Skip validation if file doesn't exist (already caught in file structure validation)
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Basic TypeScript validation
      if (!content.includes('export')) {
        warnings.push(`${file}: No exports found`);
      }

      // Check for TODO comments
      const todoCount = (content.match(/TODO:/gi) || []).length;
      if (todoCount > 0) {
        warnings.push(`${file}: ${todoCount} TODO comments found`);
      }

      // Check for console.log statements (should use proper logging)
      const consoleCount = (content.match(/console\.(log|warn|error)/g) || []).length;
      if (consoleCount > 2) {
        warnings.push(`${file}: Consider using proper logging instead of console statements`);
      }

      // File-specific validations
      switch (file) {
        case 'index.ts':
          if (!content.includes('extends BaseDataSourcePlugin')) {
            errors.push('index.ts: Plugin class should extend BaseDataSourcePlugin');
          }
          break;
        
        case 'fetcher.ts':
          if (!content.includes('implements DataFetcher')) {
            errors.push('fetcher.ts: Fetcher class should implement DataFetcher');
          }
          break;
        
        case 'transformer.ts':
          if (!content.includes('implements DataTransformer')) {
            errors.push('transformer.ts: Transformer class should implement DataTransformer');
          }
          if (!content.includes('GeoJSONFeatureCollection')) {
            warnings.push('transformer.ts: Should return GeoJSONFeatureCollection');
          }
          break;
        
        case 'validator.ts':
          if (!content.includes('implements DataValidator')) {
            errors.push('validator.ts: Validator class should implement DataValidator');
          }
          break;
      }

    } catch (error) {
      errors.push(`Failed to read ${file}: ${error}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

async function validatePluginClass(plugin: { name: string; path: string }): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Try to dynamically import and instantiate the plugin
    const pluginModule = await import(path.resolve(plugin.path, 'index.ts'));
    const PluginClass = pluginModule.default || pluginModule[Object.keys(pluginModule)[0]];
    
    if (!PluginClass) {
      errors.push('No plugin class found in index.ts');
      return { valid: false, errors, warnings };
    }

    const pluginInstance = new PluginClass();

    // Check required properties
    if (!pluginInstance.metadata) {
      errors.push('Plugin missing metadata property');
    }
    if (!pluginInstance.fetcher) {
      errors.push('Plugin missing fetcher property');
    }
    if (!pluginInstance.transformer) {
      errors.push('Plugin missing transformer property');
    }
    if (!pluginInstance.validator) {
      errors.push('Plugin missing validator property');
    }

    // Check lifecycle methods
    const lifecycleMethods = ['onLoad', 'onEnable', 'onDisable', 'onUnload'];
    for (const method of lifecycleMethods) {
      if (typeof pluginInstance[method] !== 'function') {
        warnings.push(`Plugin missing ${method} lifecycle method`);
      }
    }

    // Validate metadata consistency
    if (pluginInstance.metadata) {
      const configPath = path.join(plugin.path, 'config.json');
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJSON(configPath);
        
        if (pluginInstance.metadata.id !== config.metadata?.id) {
          warnings.push('Plugin metadata.id does not match config.json');
        }
        if (pluginInstance.metadata.name !== config.metadata?.name) {
          warnings.push('Plugin metadata.name does not match config.json');
        }
      }
    }

  } catch (error) {
    errors.push(`Failed to instantiate plugin: ${error}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function printValidationSummary(
  results: Array<{ plugin: string; path: string; results: ValidationResult[] }>,
  shouldFix: boolean
): void {
  console.log('\n' + chalk.blue.bold('📋 Validation Summary'));
  console.log('═'.repeat(60));

  let totalPlugins = results.length;
  let validPlugins = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const result of results) {
    const allErrors = result.results.flatMap(r => r.errors);
    const allWarnings = result.results.flatMap(r => r.warnings);
    const isValid = allErrors.length === 0;
    
    if (isValid) validPlugins++;
    totalErrors += allErrors.length;
    totalWarnings += allWarnings.length;

    const status = isValid ? chalk.green('✅ VALID') : chalk.red('❌ INVALID');
    const errorCount = allErrors.length > 0 ? chalk.red(`${allErrors.length} errors`) : '';
    const warningCount = allWarnings.length > 0 ? chalk.yellow(`${allWarnings.length} warnings`) : '';
    const counts = [errorCount, warningCount].filter(Boolean).join(', ');
    
    console.log(`${status} ${chalk.bold(result.plugin)} ${counts ? `(${counts})` : ''}`);
    
    // Show detailed errors and warnings
    if (allErrors.length > 0) {
      allErrors.forEach(error => {
        console.log(`  ${chalk.red('🔴')} ${error}`);
      });
    }
    
    if (allWarnings.length > 0) {
      allWarnings.forEach(warning => {
        console.log(`  ${chalk.yellow('🟡')} ${warning}`);
      });
    }
  }

  console.log('═'.repeat(60));
  console.log(chalk.blue.bold('📊 Overall Results:'));
  console.log(`  ${chalk.green(`✅ Valid plugins: ${validPlugins}/${totalPlugins}`)}`);
  console.log(`  ${chalk.red(`🔴 Total errors: ${totalErrors}`)}`);
  console.log(`  ${chalk.yellow(`🟡 Total warnings: ${totalWarnings}`)}`);

  if (totalErrors === 0) {
    console.log('\n' + chalk.green.bold('🎉 All plugins are valid!'));
  } else {
    console.log('\n' + chalk.red.bold('❌ Some plugins have validation errors'));
    
    if (shouldFix) {
      console.log(chalk.yellow('\n💡 Auto-fix is not yet implemented. Please fix errors manually.'));
    } else {
      console.log(chalk.yellow('\n💡 Run with --fix flag to attempt automatic fixes'));
    }
  }

  console.log();
} 