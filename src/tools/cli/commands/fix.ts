import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { ProxyConfigService } from '../services/ProxyConfigService.js';
import { ValidationService } from '../services/ValidationService.js';

interface FixOptions {
  plugin?: string;
  all?: boolean;
  verbose?: boolean;
}

export async function fixCORS(options: FixOptions) {
  console.log(chalk.blue('🔧 Toronto Pulse CORS Auto-Fix'));
  
  if (options.plugin) {
    await fixPluginCORS(options.plugin, options.verbose);
  } else if (options.all) {
    await fixAllPluginsCORS(options.verbose);
  } else {
    console.log(chalk.yellow('Please specify --plugin=<name> or --all'));
    console.log('Examples:');
    console.log('  npm run tp fix:cors --plugin="automated-speed-enforcement-locations"');
    console.log('  npm run tp fix:cors --all');
    return;
  }
}

export async function fixProxy(options: FixOptions) {
  console.log(chalk.blue('🔧 Toronto Pulse Proxy Auto-Fix'));
  
  const proxyService = new ProxyConfigService();
  
  try {
    await proxyService.ensureProxyConfiguration();
    console.log(chalk.green('✅ Proxy configuration validated and updated'));
  } catch (error) {
    console.error(chalk.red(`❌ Failed to fix proxy configuration: ${error instanceof Error ? error.message : String(error)}`));
  }
}

async function fixPluginCORS(pluginId: string, verbose = false): Promise<void> {
  const spinner = ora(`Analyzing ${pluginId} for CORS issues...`).start();
  
  try {
    // Load current configuration
    const configPath = await findPluginConfig(pluginId);
    if (!configPath) {
      spinner.fail(chalk.red(`Plugin configuration not found for: ${pluginId}`));
      return;
    }

    const config = await fs.readJSON(configPath);
    
    // Check if URL needs proxy
    const proxyService = new ProxyConfigService();
    const originalUrl = config.api.baseUrl;
    const updatedConfig = proxyService.configureProxy(config);
    
    if (originalUrl !== updatedConfig.api.baseUrl) {
      // Save updated configuration
      await fs.writeJSON(configPath, updatedConfig, { spaces: 2 });
      
      spinner.succeed();
      console.log(chalk.green('✅ Fixed CORS configuration:'));
      console.log(chalk.gray(`   Before: ${originalUrl}`));
      console.log(chalk.green(`   After:  ${updatedConfig.api.baseUrl}`));
      
      // Ensure proxy is configured in vite.config.ts
      await proxyService.ensureProxyConfiguration();
      
      // Validate fix
      if (verbose) {
        const validationService = new ValidationService();
        const validation = await validationService.validateBrowserCompatibility(pluginId);
        if (validation.valid) {
          console.log(chalk.green('✅ CORS fix validated successfully'));
        } else {
          console.log(chalk.yellow('⚠️  Additional issues detected:'));
          validation.errors.forEach(error => console.log(chalk.red(`   • ${error}`)));
          validation.warnings.forEach(warning => console.log(chalk.yellow(`   • ${warning}`)));
        }
      }
    } else {
      spinner.succeed();
      console.log(chalk.green('✅ No CORS issues detected'));
    }
  } catch (error) {
    spinner.fail();
    console.error(chalk.red(`❌ Failed to fix CORS for ${pluginId}: ${error instanceof Error ? error.message : String(error)}`));
  }
}

async function fixAllPluginsCORS(verbose = false): Promise<void> {
  const spinner = ora('Discovering all plugins...').start();
  
  try {
    const plugins = await discoverAllPlugins();
    spinner.succeed(`Found ${plugins.length} plugins`);
    
    for (const plugin of plugins) {
      await fixPluginCORS(plugin.id, verbose);
    }
    
    console.log(chalk.green(`\n✅ Completed CORS fixes for ${plugins.length} plugins`));
  } catch (error) {
    spinner.fail();
    console.error(chalk.red(`❌ Failed to fix all plugins: ${error instanceof Error ? error.message : String(error)}`));
  }
}

async function findPluginConfig(pluginId: string): Promise<string | null> {
  const configPaths = [
    `src/domains/transportation/${pluginId}/config.json`,
    `src/domains/infrastructure/${pluginId}/config.json`,
    `src/domains/environment/${pluginId}/config.json`,
    `src/domains/events/${pluginId}/config.json`
  ];

  for (const configPath of configPaths) {
    if (await fs.pathExists(configPath)) {
      return configPath;
    }
  }

  return null;
}

async function discoverAllPlugins(): Promise<{ id: string; path: string }[]> {
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

export async function validateBrowser(options: { plugin?: string; all?: boolean; fix?: boolean; verbose?: boolean }) {
  console.log(chalk.blue('🌐 Browser Compatibility Validation'));
  
  if (options.plugin) {
    await validatePluginInBrowser(options.plugin, options.fix, options.verbose);
  } else if (options.all) {
    await validateAllPluginsInBrowser(options.fix, options.verbose);
  } else {
    console.log(chalk.yellow('Please specify --plugin=<name> or --all'));
    console.log('Examples:');
    console.log('  npm run tp validate:browser --plugin="automated-speed-enforcement-locations"');
    console.log('  npm run tp validate:browser --all --fix');
    return;
  }
}

async function validatePluginInBrowser(pluginId: string, autoFix = false, verbose = false): Promise<void> {
  const spinner = ora(`Testing ${pluginId} in browser context...`).start();
  
  try {
    const validationService = new ValidationService();
    
    // Run comprehensive browser validation
    const validation = await validationService.validateIntegration(pluginId);
    
    if (validation.valid) {
      spinner.succeed();
      console.log(chalk.green(`✅ ${pluginId} is browser compatible`));
    } else {
      spinner.fail();
      console.log(chalk.red(`❌ ${pluginId} has browser compatibility issues:`));
      
      validation.errors.forEach(error => {
        console.log(chalk.red(`   • ${error}`));
      });
      
      if (validation.warnings.length > 0) {
        console.log(chalk.yellow('\nWarnings:'));
        validation.warnings.forEach(warning => {
          console.log(chalk.yellow(`   • ${warning}`));
        });
      }
      
      // Auto-fix if requested
      if (autoFix) {
        console.log(chalk.blue('\n🔧 Auto-fixing detected issues...'));
        await autoFixBrowserIssues(pluginId, validation);
      } else {
        console.log(chalk.blue(`\n💡 To auto-fix: npm run tp validate:browser --plugin="${pluginId}" --fix`));
      }
    }
    
    if (verbose && validation.details) {
      console.log(chalk.gray('\nDetailed Results:'));
      console.log(JSON.stringify(validation.details, null, 2));
    }
  } catch (error) {
    spinner.fail();
    console.error(chalk.red(`❌ Browser validation failed: ${error instanceof Error ? error.message : String(error)}`));
  }
}

async function validateAllPluginsInBrowser(autoFix = false, verbose = false): Promise<void> {
  const spinner = ora('Discovering plugins for browser validation...').start();
  
  try {
    const plugins = await discoverAllPlugins();
    spinner.succeed(`Found ${plugins.length} plugins`);
    
    let passedCount = 0;
    let failedCount = 0;
    
    for (const plugin of plugins) {
      const validationService = new ValidationService();
      const validation = await validationService.validateIntegration(plugin.id);
      
      if (validation.valid) {
        console.log(chalk.green(`✅ ${plugin.id}`));
        passedCount++;
      } else {
        console.log(chalk.red(`❌ ${plugin.id}`));
        failedCount++;
        
        if (autoFix) {
          await autoFixBrowserIssues(plugin.id, validation);
        }
      }
    }
    
    console.log(chalk.blue(`\n📊 Browser Validation Summary:`));
    console.log(chalk.green(`   ✅ Passed: ${passedCount}`));
    console.log(chalk.red(`   ❌ Failed: ${failedCount}`));
    console.log(chalk.gray(`   📦 Total: ${plugins.length}`));
    
  } catch (error) {
    spinner.fail();
    console.error(chalk.red(`❌ Browser validation failed: ${error instanceof Error ? error.message : String(error)}`));
  }
}

async function autoFixBrowserIssues(pluginId: string, validation: any): Promise<void> {
  const spinner = ora(`Auto-fixing issues for ${pluginId}...`).start();
  
  try {
    // Check if CORS issues can be auto-fixed
    const hasCorsIssues = validation.errors.some((error: string) => 
      error.includes('CORS') || error.includes('External URL')
    );
    
    if (hasCorsIssues) {
      await fixPluginCORS(pluginId, false);
    }
    
    // Check if proxy issues can be auto-fixed
    const hasProxyIssues = validation.errors.some((error: string) => 
      error.includes('proxy') || error.includes('vite.config.ts')
    );
    
    if (hasProxyIssues) {
      const proxyService = new ProxyConfigService();
      await proxyService.ensureProxyConfiguration();
    }
    
    spinner.succeed();
    console.log(chalk.green(`   ✅ Auto-fixed issues for ${pluginId}`));
    
  } catch (error) {
    spinner.fail();
    console.log(chalk.red(`   ❌ Auto-fix failed for ${pluginId}: ${error instanceof Error ? error.message : String(error)}`));
  }
} 