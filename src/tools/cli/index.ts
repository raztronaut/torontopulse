#!/usr/bin/env node
import { Command } from 'commander';
import { generateDataSource } from './commands/generate.js';
import { generateDataSourceEnhanced } from './commands/generate-enhanced.js';
import { testDataSource } from './commands/test.js';
import { validateAll } from './commands/validate.js';
import { discoverDatasets } from './commands/discover.js';
import { verifyIntegration } from './commands/verify.js';
import { previewDataset } from './commands/preview.js';
import { fixCORS, fixProxy, validateBrowser } from './commands/fix.js';
import { healthCheck, detectIssues } from './commands/health.js';

const program = new Command();

program
  .name('toronto-pulse')
  .description('Toronto Pulse development tools')
  .version('2.0.0');

program
  .command('generate:datasource')
  .description('Generate a new data source plugin (enhanced with auto-discovery)')
  .option('-u, --url <url>', 'Toronto Open Data URL for automatic discovery')
  .option('--auto-integrate', 'Automatically integrate with application (no prompts)')
  .option('-n, --name <name>', 'Override plugin name')
  .option('-d, --domain <domain>', 'Override domain (transportation, infrastructure, environment, events)')
  .option('-l, --layer-id <id>', 'Custom layer identifier')
  .action(generateDataSourceEnhanced);

program
  .command('generate:datasource:legacy')
  .description('Generate a new data source plugin (legacy interactive mode)')
  .option('-n, --name <name>', 'Data source name')
  .option('-d, --domain <domain>', 'Data source domain')
  .option('-u, --url <url>', 'API URL')
  .option('-t, --type <type>', 'API type (json, xml, csv, gtfs)')
  .action(generateDataSource);

program
  .command('test:datasource')
  .description('Test a data source plugin')
  .argument('<source>', 'Data source ID')
  .option('--validate', 'Run validation tests')
  .option('--verbose', 'Show detailed output')
  .action(testDataSource);

program
  .command('validate:all')
  .description('Validate all data sources')
  .option('--fix', 'Attempt to fix validation issues')
  .action(validateAll);

program
  .command('discover:datasets')
  .description('Discover new Toronto Open Data datasets')
  .option('-d, --domain <domain>', 'Filter by domain')
  .option('--geo-only', 'Only show datasets with geographic data')
  .action(discoverDatasets);

program
  .command('verify:integration')
  .description('Verify data source plugin integration')
  .option('-p, --plugin <plugin>', 'Verify specific plugin')
  .option('-l, --layer <layer>', 'Verify specific layer')
  .option('-a, --all', 'Verify all integrations')
  .option('-f, --fix', 'Auto-fix issues where possible')
  .action(verifyIntegration);

program
  .command('preview:dataset')
  .description('Preview a Toronto Open Data dataset before integration')
  .option('-u, --url <url>', 'Toronto Open Data URL to preview')
  .option('--no-interactive', 'Disable interactive mode')
  .option('-f, --format <format>', 'Output format (table, json, summary)', 'table')
  .option('-s, --sample <number>', 'Number of sample records to analyze', '10')
  .action(previewDataset);

// New CORS and Proxy Fix Commands
program
  .command('fix:cors')
  .description('Auto-fix CORS issues in plugins')
  .option('-p, --plugin <plugin>', 'Fix specific plugin')
  .option('-a, --all', 'Fix all plugins')
  .option('-v, --verbose', 'Show detailed output')
  .action(fixCORS);

program
  .command('fix:proxy')
  .description('Auto-fix proxy configuration issues')
  .option('-v, --verbose', 'Show detailed output')
  .action(fixProxy);

// New Browser Validation Commands
program
  .command('validate:browser')
  .description('Validate plugin browser compatibility and data loading')
  .option('-p, --plugin <plugin>', 'Validate specific plugin')
  .option('-a, --all', 'Validate all plugins')
  .option('-f, --fix', 'Auto-fix detected issues')
  .option('-v, --verbose', 'Show detailed output')
  .action(validateBrowser);

// New Health Monitoring Commands
program
  .command('health')
  .description('Check integration health and monitor plugin status')
  .option('-p, --plugin <plugin>', 'Check specific plugin health')
  .option('-w, --watch', 'Watch mode - continuously monitor health')
  .option('-i, --interval <seconds>', 'Watch interval in seconds', '30')
  .option('-v, --verbose', 'Show detailed health information')
  .action((options) => {
    const healthOptions = {
      ...options,
      interval: options.interval ? parseInt(options.interval) * 1000 : undefined
    };
    healthCheck(healthOptions);
  });

program
  .command('detect:issues')
  .description('Detect and suggest fixes for common integration issues')
  .action(detectIssues);

// Aliases for common commands
program
  .command('fix')
  .description('Auto-fix common issues (alias for fix:cors --all)')
  .action(() => fixCORS({ all: true }));

program
  .command('status')
  .description('Show integration status (alias for health)')
  .action(() => healthCheck({}));

program.parse(); 