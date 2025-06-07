import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { TestResult } from '../types.js';

export async function testDataSource(sourceId: string, options: any): Promise<void> {
  console.log(chalk.blue.bold(`🧪 Testing Data Source: ${sourceId}`));
  console.log(chalk.gray('Running comprehensive plugin tests...\n'));

  const results: TestResult[] = [];
  let plugin: any;

  try {
    // Step 1: Load plugin
    const loadResult = await testPluginLoading(sourceId);
    results.push(loadResult);
    
    if (!loadResult.success) {
      printResults(results);
      return;
    }

    plugin = loadResult.details.plugin;

    // Step 2: Test configuration
    const configResult = await testConfiguration(plugin);
    results.push(configResult);

    // Step 3: Test API connectivity
    const connectivityResult = await testAPIConnectivity(plugin);
    results.push(connectivityResult);

    // Step 4: Test data fetching
    let fetchedData: any;
    const fetchResult = await testDataFetching(plugin);
    results.push(fetchResult);
    
    if (fetchResult.success) {
      fetchedData = fetchResult.details.data;
    }

    // Step 5: Test data transformation
    if (fetchedData) {
      const transformResult = await testDataTransformation(plugin, fetchedData);
      results.push(transformResult);
    }

    // Step 6: Test data validation (if --validate flag)
    if (options.validate && fetchedData) {
      const validationResult = await testDataValidation(plugin, fetchedData);
      results.push(validationResult);
    }

    // Step 7: Test plugin lifecycle
    const lifecycleResult = await testPluginLifecycle(plugin);
    results.push(lifecycleResult);

  } catch (error) {
    results.push({
      step: 'General',
      success: false,
      message: `Unexpected error: ${error}`,
      details: { error }
    });
  }

  printResults(results);
  generateTestReport(sourceId, results, options.verbose);
}

async function testPluginLoading(sourceId: string): Promise<TestResult> {
  const spinner = ora('Loading plugin...').start();
  const startTime = Date.now();

  try {
    // Check if plugin directory exists
    const pluginPath = findPluginPath(sourceId);
    if (!pluginPath) {
      spinner.fail();
      return {
        step: 'Plugin Loading',
        success: false,
        message: `Plugin directory not found for: ${sourceId}`,
        duration: Date.now() - startTime
      };
    }

    // Check if required files exist
    const requiredFiles = ['config.json', 'index.ts', 'fetcher.ts', 'transformer.ts', 'validator.ts'];
    for (const file of requiredFiles) {
      const filePath = path.join(pluginPath, file);
      if (!await fs.pathExists(filePath)) {
        spinner.fail();
        return {
          step: 'Plugin Loading',
          success: false,
          message: `Missing required file: ${file}`,
          duration: Date.now() - startTime
        };
      }
    }

    // Dynamically import the plugin
    const pluginModule = await import(path.resolve(pluginPath, 'index.ts'));
    const PluginClass = pluginModule.default || pluginModule[Object.keys(pluginModule)[0]];
    const plugin = new PluginClass();

    spinner.succeed();
    return {
      step: 'Plugin Loading',
      success: true,
      message: 'Plugin loaded successfully',
      details: { plugin, pluginPath },
      duration: Date.now() - startTime
    };
  } catch (error) {
    spinner.fail();
    return {
      step: 'Plugin Loading',
      success: false,
      message: `Failed to load plugin: ${error}`,
      details: { error },
      duration: Date.now() - startTime
    };
  }
}

async function testConfiguration(plugin: any): Promise<TestResult> {
  const spinner = ora('Validating configuration...').start();
  const startTime = Date.now();

  try {
    const metadata = plugin.metadata;
    const errors: string[] = [];

    // Check required metadata fields
    if (!metadata.id) errors.push('Missing metadata.id');
    if (!metadata.name) errors.push('Missing metadata.name');
    if (!metadata.domain) errors.push('Missing metadata.domain');
    if (!metadata.version) errors.push('Missing metadata.version');
    
    // Check domain validity
    const validDomains = ['transportation', 'infrastructure', 'environment', 'events'];
    if (!validDomains.includes(metadata.domain)) {
      errors.push(`Invalid domain: ${metadata.domain}`);
    }

    // Check refresh interval
    if (typeof metadata.refreshInterval !== 'number' || metadata.refreshInterval < 1000) {
      errors.push('Invalid refreshInterval (must be >= 1000ms)');
    }

    if (errors.length > 0) {
      spinner.fail();
      return {
        step: 'Configuration',
        success: false,
        message: `Configuration errors: ${errors.join(', ')}`,
        details: { errors },
        duration: Date.now() - startTime
      };
    }

    spinner.succeed();
    return {
      step: 'Configuration',
      success: true,
      message: 'Configuration is valid',
      details: { metadata },
      duration: Date.now() - startTime
    };
  } catch (error) {
    spinner.fail();
    return {
      step: 'Configuration',
      success: false,
      message: `Configuration test failed: ${error}`,
      details: { error },
      duration: Date.now() - startTime
    };
  }
}

async function testAPIConnectivity(plugin: any): Promise<TestResult> {
  const spinner = ora('Testing API connectivity...').start();
  const startTime = Date.now();

  try {
    // Try to make a HEAD request to check if the API is reachable
    const fetcher = plugin.fetcher;
    if (!fetcher.baseUrl) {
      spinner.warn();
      return {
        step: 'API Connectivity',
        success: false,
        message: 'No baseUrl found in fetcher',
        duration: Date.now() - startTime
      };
    }

    const response = await fetch(fetcher.baseUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (response.ok || response.status === 405) { // 405 = Method Not Allowed (still reachable)
      spinner.succeed();
      return {
        step: 'API Connectivity',
        success: true,
        message: `API is reachable (HTTP ${response.status})`,
        details: { status: response.status, url: fetcher.baseUrl },
        duration: Date.now() - startTime
      };
    } else {
      spinner.warn();
      return {
        step: 'API Connectivity',
        success: false,
        message: `API returned HTTP ${response.status}`,
        details: { status: response.status, url: fetcher.baseUrl },
        duration: Date.now() - startTime
      };
    }
  } catch (error) {
    spinner.warn();
    return {
      step: 'API Connectivity',
      success: false,
      message: `Cannot reach API: ${error}`,
      details: { error },
      duration: Date.now() - startTime
    };
  }
}

async function testDataFetching(plugin: any): Promise<TestResult> {
  const spinner = ora('Fetching data...').start();
  const startTime = Date.now();

  try {
    const data = await plugin.fetcher.fetch();
    
    if (!data) {
      spinner.fail();
      return {
        step: 'Data Fetching',
        success: false,
        message: 'No data returned from API',
        duration: Date.now() - startTime
      };
    }

    spinner.succeed();
    return {
      step: 'Data Fetching',
      success: true,
      message: `Successfully fetched ${Array.isArray(data) ? data.length : 'data'} items`,
      details: { data, dataType: typeof data, isArray: Array.isArray(data) },
      duration: Date.now() - startTime
    };
  } catch (error) {
    spinner.fail();
    return {
      step: 'Data Fetching',
      success: false,
      message: `Data fetching failed: ${error}`,
      details: { error },
      duration: Date.now() - startTime
    };
  }
}

async function testDataTransformation(plugin: any, data: any): Promise<TestResult> {
  const spinner = ora('Transforming data...').start();
  const startTime = Date.now();

  try {
    const geoJson = plugin.transformer.transform(data);

    if (!geoJson || geoJson.type !== 'FeatureCollection') {
      spinner.fail();
      return {
        step: 'Data Transformation',
        success: false,
        message: 'Transformation did not produce valid GeoJSON FeatureCollection',
        details: { result: geoJson },
        duration: Date.now() - startTime
      };
    }

    if (!Array.isArray(geoJson.features)) {
      spinner.fail();
      return {
        step: 'Data Transformation',
        success: false,
        message: 'GeoJSON features is not an array',
        details: { features: geoJson.features },
        duration: Date.now() - startTime
      };
    }

    spinner.succeed();
    return {
      step: 'Data Transformation',
      success: true,
      message: `Transformed to GeoJSON with ${geoJson.features.length} features`,
      details: { geoJson, featureCount: geoJson.features.length },
      duration: Date.now() - startTime
    };
  } catch (error) {
    spinner.fail();
    return {
      step: 'Data Transformation',
      success: false,
      message: `Data transformation failed: ${error}`,
      details: { error },
      duration: Date.now() - startTime
    };
  }
}

async function testDataValidation(plugin: any, data: any): Promise<TestResult> {
  const spinner = ora('Validating data...').start();
  const startTime = Date.now();

  try {
    const result = plugin.validator.validate(data);

    if (!result || typeof result.valid !== 'boolean') {
      spinner.fail();
      return {
        step: 'Data Validation',
        success: false,
        message: 'Validator did not return proper ValidationResult',
        details: { result },
        duration: Date.now() - startTime
      };
    }

    if (result.valid) {
      const warningText = result.warnings?.length ? ` (${result.warnings.length} warnings)` : '';
      spinner.succeed();
      return {
        step: 'Data Validation',
        success: true,
        message: `Data validation passed${warningText}`,
        details: result,
        duration: Date.now() - startTime
      };
    } else {
      spinner.warn();
      return {
        step: 'Data Validation',
        success: false,
        message: `Data validation failed: ${result.errors?.join(', ')}`,
        details: result,
        duration: Date.now() - startTime
      };
    }
  } catch (error) {
    spinner.fail();
    return {
      step: 'Data Validation',
      success: false,
      message: `Data validation error: ${error}`,
      details: { error },
      duration: Date.now() - startTime
    };
  }
}

async function testPluginLifecycle(plugin: any): Promise<TestResult> {
  const spinner = ora('Testing plugin lifecycle...').start();
  const startTime = Date.now();

  try {
    // Test lifecycle methods
    await plugin.onLoad();
    await plugin.onEnable();
    await plugin.onDisable();
    await plugin.onUnload();

    spinner.succeed();
    return {
      step: 'Plugin Lifecycle',
      success: true,
      message: 'All lifecycle methods executed successfully',
      duration: Date.now() - startTime
    };
  } catch (error) {
    spinner.fail();
    return {
      step: 'Plugin Lifecycle',
      success: false,
      message: `Lifecycle test failed: ${error}`,
      details: { error },
      duration: Date.now() - startTime
    };
  }
}

function findPluginPath(sourceId: string): string | null {
  const domains = ['transportation', 'infrastructure', 'environment', 'events'];
  
  for (const domain of domains) {
    const pluginPath = path.join('src', 'domains', domain, sourceId);
    if (fs.existsSync(pluginPath)) {
      return pluginPath;
    }
  }
  
  return null;
}

function printResults(results: TestResult[]): void {
  console.log('\n' + chalk.blue.bold('📊 Test Results'));
  console.log('─'.repeat(50));

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? chalk.green : chalk.red;
    const duration = result.duration ? chalk.gray(`(${result.duration}ms)`) : '';
    
    console.log(`${icon} ${color(result.step)}: ${result.message} ${duration}`);
    
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('─'.repeat(50));
  console.log(`${chalk.green(`✅ Passed: ${passed}`)} | ${chalk.red(`❌ Failed: ${failed}`)}`);
  
  const overallSuccess = failed === 0;
  const overallMessage = overallSuccess ? 
    chalk.green.bold('🎉 All tests passed!') : 
    chalk.red.bold('❌ Some tests failed');
  
  console.log(`\n${overallMessage}\n`);
}

function generateTestReport(_sourceId: string, results: TestResult[], verbose: boolean): void {
  if (!verbose) return;

  console.log(chalk.blue.bold('📋 Detailed Test Report'));
  console.log('─'.repeat(60));

  for (const result of results) {
    console.log(`\n${chalk.bold(result.step)}:`);
    console.log(`  Status: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Message: ${result.message}`);
    if (result.duration) {
      console.log(`  Duration: ${result.duration}ms`);
    }
    
    if (result.details && verbose) {
      console.log(`  Details:`);
      if (result.step === 'Data Validation' && result.details.warnings) {
        console.log(`    Warnings: ${result.details.warnings.length}`);
        result.details.warnings.forEach((warning: string, i: number) => {
          console.log(`      ${i + 1}. ${warning}`);
        });
      }
      if (result.step === 'Data Fetching' && result.details.dataType) {
        console.log(`    Data Type: ${result.details.dataType}`);
        console.log(`    Is Array: ${result.details.isArray}`);
      }
    }
  }
} 