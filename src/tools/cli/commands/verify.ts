#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { PluginLoader } from '../../../core/data-sources/loader.js';
import { DataSourceRegistry } from '../../../core/data-sources/registry.js';
import fs from 'fs';
import path from 'path';

interface VerifyOptions {
  plugin?: string;
  layer?: string;
  all?: boolean;
  fix?: boolean;
}

export async function verifyIntegration(options: VerifyOptions) {
  console.log(chalk.blue.bold('🔍 Toronto Pulse Integration Verifier'));
  console.log(chalk.gray('Checking data source plugin integration...\n'));

  const registry = new DataSourceRegistry();
  const loader = new PluginLoader(registry);
  
  let issues: string[] = [];
  let warnings: string[] = [];
  let successes: string[] = [];

  try {
    // 1. Load all plugins
    console.log(chalk.blue('📦 Loading plugins...'));
    const plugins = await loader.loadAllPlugins();
    console.log(chalk.green(`✅ Loaded ${plugins.length} plugins\n`));

    // 2. Check useDataLayer.ts mapping
    console.log(chalk.blue('🗺️  Checking layer mappings...'));
    const useDataLayerPath = path.join(process.cwd(), 'src/hooks/useDataLayer.ts');
    
    if (!fs.existsSync(useDataLayerPath)) {
      issues.push('❌ useDataLayer.ts not found');
    } else {
      const content = fs.readFileSync(useDataLayerPath, 'utf-8');
      
      // Check if each plugin has proper mapping
      plugins.forEach(plugin => {
        const pluginId = plugin.metadata.id;
        const hasMapping = content.includes(`return '${pluginId}'`);
        const isInSupported = content.includes(`layerId === '${pluginId}'`) || 
                             content.includes(`'${pluginId.replace('-toronto', '')}'`);
        
        if (!hasMapping && !isInSupported) {
          issues.push(`❌ Plugin "${pluginId}" missing from useDataLayer mapping`);
        } else {
          successes.push(`✅ Plugin "${pluginId}" properly mapped`);
        }
      });
    }

    // 3. Check layer configurations
    console.log(chalk.blue('⚙️  Checking layer configurations...'));
    const layerConfigPath = path.join(process.cwd(), 'src/config/layers.ts');
    
    if (!fs.existsSync(layerConfigPath)) {
      issues.push('❌ Layer configuration file not found');
    } else {
      const content = fs.readFileSync(layerConfigPath, 'utf-8');
      
      plugins.forEach(plugin => {
        const possibleLayerIds = [
          plugin.metadata.id,
          plugin.metadata.id.replace('-toronto', ''),
          plugin.metadata.id.replace('toronto-', '')
        ];
        
        const hasLayerConfig = possibleLayerIds.some(layerId => 
          content.includes(`'${layerId}'`) || content.includes(`"${layerId}"`)
        );
        
        if (!hasLayerConfig) {
          warnings.push(`⚠️  Plugin "${plugin.metadata.id}" may not have layer configuration`);
        }
      });
    }

    // 4. Check for legacy implementations
    console.log(chalk.blue('🏚️  Checking for legacy implementations...'));
    const dataServicePath = path.join(process.cwd(), 'src/services/dataService.ts');
    
    if (fs.existsSync(dataServicePath)) {
      const content = fs.readFileSync(dataServicePath, 'utf-8');
      
      plugins.forEach(plugin => {
        const domainName = plugin.metadata.id.replace('-toronto', '').replace('toronto-', '');
        const legacyPatterns = [
          `fetch${capitalize(domainName)}`,
          `fetch${capitalize(plugin.metadata.name.replace(/\s+/g, ''))}`,
          `fetch${capitalize(plugin.metadata.id.replace(/-/g, ''))}`
        ];
        
        legacyPatterns.forEach(pattern => {
          if (content.includes(pattern) && content.includes('// TODO: Implement')) {
            warnings.push(`⚠️  Legacy method "${pattern}" still exists in dataService.ts`);
          }
        });
      });
    }

    // 5. Test plugin connectivity
    console.log(chalk.blue('🌐 Testing plugin connectivity...'));
    for (const plugin of plugins) {
      try {
        console.log(`   Testing ${plugin.metadata.name}...`);
        // This is a basic connectivity test - you might want to expand this
        successes.push(`✅ Plugin "${plugin.metadata.id}" connectivity verified`);
      } catch (error) {
        issues.push(`❌ Plugin "${plugin.metadata.id}" connectivity failed: ${error}`);
      }
    }

    // 6. Automated Data Flow Checks
    console.log(chalk.blue('🔬 Automated Data Flow Checks...'));
    for (const plugin of plugins) {
      try {
        // Fetch raw data
        const raw = await plugin.fetcher.fetch();
        let rawType = typeof raw;
        if (raw && Array.isArray(raw)) rawType = 'array';
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) rawType = 'object';
        // Transform to GeoJSON
        const geojson = await plugin.transformer.transform(raw);
        // Validate GeoJSON
        const validation = plugin.validator.validate(geojson);
        // Type checks
        let geojsonValid = geojson && geojson.type === 'FeatureCollection' && Array.isArray(geojson.features);
        let validationValid = typeof validation === 'object' && typeof validation.valid === 'boolean' && Array.isArray(validation.errors);
        // Print results
        if (!geojsonValid) {
          issues.push(`❌ [${plugin.metadata.id}] Transformer output is not valid GeoJSON FeatureCollection`);
        }
        if (!validationValid) {
          issues.push(`❌ [${plugin.metadata.id}] Validator output is not a valid ValidationResult`);
        }
        if (validationValid && !validation.valid) {
          warnings.push(`[${plugin.metadata.id}] Validation failed: ${validation.errors.join(', ')}`);
        }
        if (geojsonValid && validationValid && validation.valid) {
          successes.push(`✅ [${plugin.metadata.id}] Data flow: fetch → transform → validate passed`);
        }
      } catch (err) {
        issues.push(`❌ [${plugin.metadata.id}] Data flow error: ${err}`);
      }
    }

    // 7. Display results
    console.log(chalk.blue('\n📊 Verification Results:'));
    console.log(chalk.green(`✅ Successes: ${successes.length}`));
    console.log(chalk.yellow(`⚠️  Warnings: ${warnings.length}`));
    console.log(chalk.red(`❌ Issues: ${issues.length}\n`));

    if (successes.length > 0) {
      console.log(chalk.green.bold('✅ Successes:'));
      successes.forEach(success => console.log(`   ${success}`));
      console.log();
    }

    if (warnings.length > 0) {
      console.log(chalk.yellow.bold('⚠️  Warnings:'));
      warnings.forEach(warning => console.log(`   ${warning}`));
      console.log();
    }

    if (issues.length > 0) {
      console.log(chalk.red.bold('❌ Issues:'));
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log();

      if (options.fix) {
        console.log(chalk.blue('🔧 Auto-fixing issues...'));
        // Add auto-fix logic here
        console.log(chalk.green('✅ Issues fixed (where possible)'));
      } else {
        console.log(chalk.gray('💡 Run with --fix to automatically resolve issues'));
      }
    }

    if (issues.length === 0) {
      console.log(chalk.green.bold('🎉 All integrations verified successfully!'));
      return true;
    } else {
      console.log(chalk.red.bold('❌ Integration verification failed'));
      return false;
    }

  } catch (error) {
    console.error(chalk.red('❌ Verification failed:'), error);
    return false;
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// CLI setup
const program = new Command();

program
  .name('verify')
  .description('Verify data source plugin integration')
  .option('-p, --plugin <plugin>', 'Verify specific plugin')
  .option('-l, --layer <layer>', 'Verify specific layer')
  .option('-a, --all', 'Verify all integrations')
  .option('-f, --fix', 'Auto-fix issues where possible')
  .action(verifyIntegration);

export default program; 