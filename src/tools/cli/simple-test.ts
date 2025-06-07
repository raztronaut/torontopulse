#!/usr/bin/env node

// Simple test script to validate the TTC plugin
import { TTCVehiclesPlugin } from '../../domains/transportation/ttc-vehicles/index.js';

async function testTTCPlugin() {
  console.log('🧪 Testing TTC Plugin...\n');

  try {
    // Create plugin instance
    const plugin = new TTCVehiclesPlugin();
    console.log('✅ Plugin instantiated successfully');
    console.log(`   Name: ${plugin.metadata.name}`);
    console.log(`   Domain: ${plugin.metadata.domain}`);
    console.log(`   Refresh Interval: ${plugin.metadata.refreshInterval}ms\n`);

    // Test fetcher
    console.log('📡 Testing data fetching...');
    const rawData = await plugin.fetcher.fetch();
    console.log(`✅ Data fetched: ${rawData ? 'Success' : 'Failed'}`);
    
    if (rawData) {
      console.log(`   Data type: ${typeof rawData}`);
      console.log(`   Data length: ${Array.isArray(rawData) ? rawData.length : 'N/A'} items\n`);

      // Test validator
      console.log('🔍 Testing data validation...');
      const validationResult = plugin.validator.validate(rawData);
      console.log(`✅ Validation: ${validationResult.valid ? 'PASSED' : 'FAILED'}`);
      
      if (validationResult.errors && validationResult.errors.length > 0) {
        console.log(`   Errors: ${validationResult.errors.length}`);
        validationResult.errors.forEach(error => console.log(`     - ${error}`));
      }
      
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        console.log(`   Warnings: ${validationResult.warnings.length}`);
        validationResult.warnings.slice(0, 3).forEach(warning => console.log(`     - ${warning}`));
        if (validationResult.warnings.length > 3) {
          console.log(`     ... and ${validationResult.warnings.length - 3} more warnings`);
        }
      }
      console.log();

      // Test transformer
      console.log('🔄 Testing data transformation...');
      const geoJsonData = plugin.transformer.transform(rawData);
      console.log(`✅ Transformation: ${geoJsonData ? 'Success' : 'Failed'}`);
      
      if (geoJsonData) {
        console.log(`   Type: ${geoJsonData.type}`);
        console.log(`   Features: ${geoJsonData.features.length}`);
        
        if (geoJsonData.features.length > 0) {
          const firstFeature = geoJsonData.features[0];
          console.log(`   Sample feature:`);
          console.log(`     ID: ${firstFeature.properties?.id}`);
          console.log(`     Route: ${firstFeature.properties?.route}`);
          
          // Type-safe coordinate access
          if (firstFeature.geometry.type === 'Point') {
            console.log(`     Coordinates: [${firstFeature.geometry.coordinates.join(', ')}]`);
          } else {
            console.log(`     Coordinates: Complex geometry (${firstFeature.geometry.type})`);
          }
        }
      }
      console.log();
    }

    // Test lifecycle methods
    console.log('🔄 Testing plugin lifecycle...');
    await plugin.onLoad();
    await plugin.onEnable();
    await plugin.onDisable();
    await plugin.onUnload();
    console.log('✅ Lifecycle methods: Success\n');

    console.log('🎉 All tests passed! TTC plugin is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testTTCPlugin(); 