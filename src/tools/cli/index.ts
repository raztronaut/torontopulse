#!/usr/bin/env node
import { Command } from 'commander';
import { generateDataSource } from './commands/generate.js';
import { testDataSource } from './commands/test.js';
import { validateAll } from './commands/validate.js';
import { discoverDatasets } from './commands/discover.js';
import { verifyIntegration } from './commands/verify.js';

const program = new Command();

program
  .name('toronto-pulse')
  .description('Toronto Pulse development tools')
  .version('1.0.0');

program
  .command('generate:datasource')
  .description('Generate a new data source plugin')
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

program.parse(); 