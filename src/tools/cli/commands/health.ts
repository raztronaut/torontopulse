import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { ValidationService, PluginHealth } from '../services/ValidationService.js';

interface HealthOptions {
  watch?: boolean;
  interval?: number;
  plugin?: string;
  verbose?: boolean;
}

export async function healthCheck(options: HealthOptions) {
  console.log(chalk.blue('🏥 Toronto Pulse Integration Health Check'));
  
  if (options.plugin) {
    await checkSinglePluginHealth(options.plugin, options.verbose);
  } else {
    await checkAllPluginsHealth(options);
  }
  
  if (options.watch) {
    const interval = options.interval || 30000; // 30 seconds
    console.log(chalk.gray(`\n👀 Watching for changes every ${interval / 1000} seconds...`));
    console.log(chalk.gray('Press Ctrl+C to stop watching\n'));
    
    setInterval(async () => {
      console.log(chalk.blue('\n🔄 Refreshing health status...'));
      await checkAllPluginsHealth({ ...options, watch: false });
    }, interval);
  }
}

async function checkSinglePluginHealth(pluginId: string, verbose = false): Promise<void> {
  const spinner = ora(`Checking health of ${pluginId}...`).start();
  
  try {
    const validationService = new ValidationService();
    const health = await validationService.checkPluginHealth(pluginId);
    
    spinner.succeed();
    displayPluginHealth(health, verbose);
  } catch (error) {
    spinner.fail();
    console.error(chalk.red(`❌ Health check failed: ${error instanceof Error ? error.message : String(error)}`));
  }
}

async function checkAllPluginsHealth(options: HealthOptions): Promise<void> {
  const spinner = ora('Discovering plugins...').start();
  
  try {
    const plugins = await discoverAllPlugins();
    spinner.text = `Checking health of ${plugins.length} plugins...`;
    
    const validationService = new ValidationService();
    const healthResults = await Promise.all(
      plugins.map(plugin => validationService.checkPluginHealth(plugin.id))
    );
    
    spinner.succeed();
    displayHealthDashboard(healthResults, options.verbose);
  } catch (error) {
    spinner.fail();
    console.error(chalk.red(`❌ Health check failed: ${error instanceof Error ? error.message : String(error)}`));
  }
}

function displayPluginHealth(health: PluginHealth, verbose = false): void {
  const statusIcon = getStatusIcon(health.status);
  const statusColor = getStatusColor(health.status);
  
  console.log(`\n${statusIcon} ${statusColor(health.name)} (${health.id})`);
  
  if (health.status === 'healthy') {
    console.log(chalk.green(`   ✅ Status: Healthy`));
    console.log(chalk.gray(`   📊 Data Count: ${health.dataCount}`));
    console.log(chalk.gray(`   ⚡ Fetch Time: ${health.fetchTime}ms`));
    if (health.lastFetch) {
      console.log(chalk.gray(`   🕐 Last Fetch: ${health.lastFetch.toLocaleString()}`));
    }
  } else {
    console.log(chalk.red(`   ❌ Status: ${health.status}`));
    if (health.issues.length > 0) {
      console.log(chalk.red(`   🚨 Issues:`));
      health.issues.forEach(issue => {
        console.log(chalk.red(`      • ${issue}`));
      });
    }
  }
  
  if (verbose) {
    console.log(chalk.gray(`   📋 Full Details:`));
    console.log(chalk.gray(`      ID: ${health.id}`));
    console.log(chalk.gray(`      Name: ${health.name}`));
    console.log(chalk.gray(`      Status: ${health.status}`));
    console.log(chalk.gray(`      Data Count: ${health.dataCount}`));
    console.log(chalk.gray(`      Fetch Time: ${health.fetchTime}ms`));
    console.log(chalk.gray(`      Last Fetch: ${health.lastFetch?.toISOString() || 'Never'}`));
    console.log(chalk.gray(`      Issues: ${health.issues.length}`));
  }
}

function displayHealthDashboard(healthResults: PluginHealth[], verbose = false): void {
  const healthy = healthResults.filter(h => h.status === 'healthy');
  const warnings = healthResults.filter(h => h.status === 'warning');
  const errors = healthResults.filter(h => h.status === 'error');
  
  console.log(chalk.blue('\n📊 Integration Health Dashboard'));
  console.log(chalk.blue('═'.repeat(50)));
  
  // Summary
  console.log(chalk.green(`✅ Healthy: ${healthy.length}`));
  console.log(chalk.yellow(`⚠️  Warnings: ${warnings.length}`));
  console.log(chalk.red(`❌ Errors: ${errors.length}`));
  console.log(chalk.gray(`📦 Total: ${healthResults.length}`));
  
  // Performance metrics
  if (healthy.length > 0) {
    const avgFetchTime = healthy.reduce((sum, h) => sum + h.fetchTime, 0) / healthy.length;
    const totalDataCount = healthy.reduce((sum, h) => sum + h.dataCount, 0);
    
    console.log(chalk.blue('\n⚡ Performance Metrics'));
    console.log(chalk.gray(`   Average Fetch Time: ${Math.round(avgFetchTime)}ms`));
    console.log(chalk.gray(`   Total Data Points: ${totalDataCount.toLocaleString()}`));
  }
  
  // Detailed status
  console.log(chalk.blue('\n📋 Plugin Status'));
  
  // Show healthy plugins (condensed)
  if (healthy.length > 0) {
    console.log(chalk.green('\n✅ Healthy Plugins:'));
    healthy.forEach(health => {
      const fetchTime = health.fetchTime < 1000 ? 
        chalk.green(`${health.fetchTime}ms`) : 
        chalk.yellow(`${health.fetchTime}ms`);
      console.log(chalk.green(`   ✅ ${health.name} (${health.dataCount} records, ${fetchTime})`));
    });
  }
  
  // Show warnings (detailed)
  if (warnings.length > 0) {
    console.log(chalk.yellow('\n⚠️  Plugins with Warnings:'));
    warnings.forEach(health => {
      displayPluginHealth(health, verbose);
    });
  }
  
  // Show errors (detailed)
  if (errors.length > 0) {
    console.log(chalk.red('\n❌ Plugins with Errors:'));
    errors.forEach(health => {
      displayPluginHealth(health, verbose);
    });
  }
  
  // Suggestions
  if (warnings.length > 0 || errors.length > 0) {
    console.log(chalk.blue('\n💡 Suggestions:'));
    
    if (errors.length > 0) {
      console.log(chalk.blue('   • Run auto-fix for error plugins:'));
      errors.forEach(health => {
        console.log(chalk.gray(`     npm run tp fix:cors --plugin="${health.id}"`));
      });
    }
    
    if (warnings.length > 0) {
      console.log(chalk.blue('   • Investigate warning plugins:'));
      warnings.forEach(health => {
        console.log(chalk.gray(`     npm run tp validate:browser --plugin="${health.id}" --verbose`));
      });
    }
    
    console.log(chalk.blue('   • Run comprehensive validation:'));
    console.log(chalk.gray('     npm run tp validate:browser --all --fix'));
  }
  
  console.log(chalk.blue('\n═'.repeat(50)));
  console.log(chalk.gray(`Last updated: ${new Date().toLocaleString()}`));
}

function getStatusIcon(status: 'healthy' | 'warning' | 'error'): string {
  switch (status) {
    case 'healthy': return '✅';
    case 'warning': return '⚠️';
    case 'error': return '❌';
    default: return '❓';
  }
}

function getStatusColor(status: 'healthy' | 'warning' | 'error'): (text: string) => string {
  switch (status) {
    case 'healthy': return chalk.green;
    case 'warning': return chalk.yellow;
    case 'error': return chalk.red;
    default: return chalk.gray;
  }
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

export async function detectIssues(): Promise<void> {
  console.log(chalk.blue('🔍 Toronto Pulse Issue Detection'));
  
  const spinner = ora('Scanning for integration issues...').start();
  
  try {
    const issueDetectionService = new IssueDetectionService();
    const issues = await issueDetectionService.detectIssues();
    
    spinner.succeed(`Found ${issues.length} issues`);
    
    if (issues.length === 0) {
      console.log(chalk.green('✅ No issues detected! All integrations are healthy.'));
      return;
    }
    
    console.log(chalk.red(`\n🚨 Detected ${issues.length} issues:`));
    
    issues.forEach((issue, index) => {
      console.log(chalk.red(`\n${index + 1}. ${issue.title}`));
      console.log(chalk.gray(`   Plugin: ${issue.pluginId}`));
      console.log(chalk.gray(`   Type: ${issue.type}`));
      console.log(chalk.gray(`   Description: ${issue.description}`));
      
      if (issue.suggestedFix) {
        console.log(chalk.blue(`   💡 Suggested Fix: ${issue.suggestedFix.description}`));
        console.log(chalk.gray(`   Command: ${issue.suggestedFix.command}`));
      }
    });
    
    // Auto-suggest fixes
    const fixes = await issueDetectionService.suggestFixes(issues);
    
    if (fixes.length > 0) {
      console.log(chalk.blue('\n🔧 Auto-Fix Commands:'));
      fixes.forEach(fix => {
        console.log(chalk.blue(`   ${fix.command}`));
      });
      
      console.log(chalk.blue('\n💡 Run all fixes:'));
      console.log(chalk.gray('   npm run tp fix:cors --all'));
    }
    
  } catch (error) {
    spinner.fail();
    console.error(chalk.red(`❌ Issue detection failed: ${error instanceof Error ? error.message : String(error)}`));
  }
}

interface Issue {
  id: string;
  pluginId: string;
  type: 'cors' | 'proxy' | 'data' | 'config';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestedFix?: {
    command: string;
    description: string;
  };
}

interface Fix {
  issue: string;
  command: string;
  description: string;
}

class IssueDetectionService {
  /**
   * Continuously monitor for common integration issues
   */
  async detectIssues(): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    // Check for CORS errors in browser logs
    const corsIssues = await this.detectCORSIssues();
    issues.push(...corsIssues);
    
    // Check for proxy misconfigurations
    const proxyIssues = await this.detectProxyIssues();
    issues.push(...proxyIssues);
    
    // Check for data loading failures
    const dataIssues = await this.detectDataLoadingIssues();
    issues.push(...dataIssues);
    
    return issues;
  }

  /**
   * Auto-suggest fixes for detected issues
   */
  async suggestFixes(issues: Issue[]): Promise<Fix[]> {
    return issues.map(issue => {
      switch (issue.type) {
        case 'cors':
          return {
            issue: issue.id,
            command: `npm run tp fix:cors --plugin="${issue.pluginId}"`,
            description: 'Configure proxy for CORS compliance'
          };
        case 'proxy':
          return {
            issue: issue.id,
            command: `npm run tp fix:proxy --plugin="${issue.pluginId}"`,
            description: 'Update proxy configuration'
          };
        default:
          return {
            issue: issue.id,
            command: `npm run tp validate:browser --plugin="${issue.pluginId}" --fix`,
            description: 'Run comprehensive validation and auto-fix'
          };
      }
    });
  }

  private async detectCORSIssues(): Promise<Issue[]> {
    const issues: Issue[] = [];
    const plugins = await this.discoverAllPlugins();
    
    for (const plugin of plugins) {
      try {
        const configPath = await this.findPluginConfig(plugin.id);
        if (!configPath) continue;
        
        const config = await fs.readJSON(configPath);
        const url = config.api?.baseUrl;
        
        if (url && url.startsWith('http') && !url.startsWith('/')) {
          issues.push({
            id: `cors-${plugin.id}`,
            pluginId: plugin.id,
            type: 'cors',
            title: 'CORS Configuration Issue',
            description: `Plugin uses external URL that will cause CORS errors in browser: ${url}`,
            severity: 'high',
            suggestedFix: {
              command: `npm run tp fix:cors --plugin="${plugin.id}"`,
              description: 'Configure proxy to resolve CORS issues'
            }
          });
        }
      } catch (error) {
        // Skip plugins with config issues
      }
    }
    
    return issues;
  }

  private async detectProxyIssues(): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    try {
      const viteConfigPath = 'vite.config.ts';
      
      if (!await fs.pathExists(viteConfigPath)) {
        issues.push({
          id: 'proxy-missing-vite-config',
          pluginId: 'global',
          type: 'proxy',
          title: 'Missing Vite Configuration',
          description: 'vite.config.ts not found',
          severity: 'high',
          suggestedFix: {
            command: 'npm run tp fix:proxy',
            description: 'Create vite.config.ts with proxy configuration'
          }
        });
        return issues;
      }

      const content = await fs.readFile(viteConfigPath, 'utf-8');
      
      if (!content.includes('proxy:')) {
        issues.push({
          id: 'proxy-missing-config',
          pluginId: 'global',
          type: 'proxy',
          title: 'Missing Proxy Configuration',
          description: 'No proxy configuration found in vite.config.ts',
          severity: 'medium',
          suggestedFix: {
            command: 'npm run tp fix:proxy',
            description: 'Add proxy configuration to vite.config.ts'
          }
        });
      }

      if (!content.includes('/api/toronto-open-data')) {
        issues.push({
          id: 'proxy-missing-toronto',
          pluginId: 'global',
          type: 'proxy',
          title: 'Missing Toronto Open Data Proxy',
          description: 'Toronto Open Data proxy not configured',
          severity: 'medium',
          suggestedFix: {
            command: 'npm run tp fix:proxy',
            description: 'Add Toronto Open Data proxy configuration'
          }
        });
      }
    } catch (error) {
      issues.push({
        id: 'proxy-config-error',
        pluginId: 'global',
        type: 'proxy',
        title: 'Proxy Configuration Error',
        description: `Error reading vite.config.ts: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'high'
      });
    }
    
    return issues;
  }

  private async detectDataLoadingIssues(): Promise<Issue[]> {
    const issues: Issue[] = [];
    const plugins = await this.discoverAllPlugins();
    
    for (const plugin of plugins) {
      try {
        const validationService = new ValidationService();
        const health = await validationService.checkPluginHealth(plugin.id);
        
        if (health.status === 'error') {
          issues.push({
            id: `data-${plugin.id}`,
            pluginId: plugin.id,
            type: 'data',
            title: 'Data Loading Failure',
            description: `Plugin failed to load data: ${health.issues.join(', ')}`,
            severity: 'high',
            suggestedFix: {
              command: `npm run tp validate:browser --plugin="${plugin.id}" --fix`,
              description: 'Run validation and auto-fix data loading issues'
            }
          });
        }
      } catch (error) {
        issues.push({
          id: `data-error-${plugin.id}`,
          pluginId: plugin.id,
          type: 'data',
          title: 'Data Validation Error',
          description: `Error validating plugin: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'medium'
        });
      }
    }
    
    return issues;
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

  private async findPluginConfig(pluginId: string): Promise<string | null> {
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
} 