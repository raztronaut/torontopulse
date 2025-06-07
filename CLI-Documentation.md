# Toronto Pulse CLI Documentation

## 🚀 Overview

The Toronto Pulse CLI is a comprehensive developer toolkit for managing data source plugins, providing an end-to-end workflow from plugin generation to production deployment. Built during Phase 3 and enhanced in Phase 4, it transforms data source development from hours to minutes with robust type safety, automated data flow validation, and comprehensive integration checks.

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ with npm
- TypeScript knowledge for plugin customization
- Toronto Pulse project cloned locally

### Quick Start
```bash
# Install dependencies
npm install

# Verify CLI is working
npm run tp --help

# Test with existing plugin
npm run tp test:datasource ttc-vehicles --validate

# Verify all integrations
npm run tp verify:integration --all
```

---

## 🛠️ Core Commands

### 1. `generate:datasource` - Plugin Generation

Creates a complete data source plugin with automatic integration and type safety.

#### Basic Usage
```bash
npm run tp generate:datasource
```

#### Advanced Usage
```bash
npm run tp generate:datasource \
  --name="Road Restrictions Toronto" \
  --domain="infrastructure" \
  --url="https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search"
```

#### Options
- `--name <name>` - Data source name (interactive if not provided)
- `--domain <domain>` - Domain: transportation, infrastructure, environment, events
- `--url <url>` - API endpoint URL
- `--type <type>` - API type: json, xml, csv, gtfs (auto-detected)
- `--layer-id <id>` - Custom layer identifier

#### ✨ New Features (Post-Improvement)
- **Schema Inference**: Prompts for nested array property paths
- **Type Generation**: Auto-creates TypeScript helper types
- **Data Flow Templates**: Generates transformer/validator logic based on API structure
- **Enhanced Integration**: Automatic layer mapping and plugin registration

#### What Gets Generated
```
src/domains/{domain}/{plugin-name}/
├── config.json          # Plugin configuration
├── index.ts             # Main plugin class
├── fetcher.ts           # Data fetching logic
├── transformer.ts       # Data transformation (with nested array handling)
├── validator.ts         # Data validation (with nested array support)
├── types/               # TypeScript helper types (NEW)
│   ├── raw.ts          # API response interface placeholder
│   └── geojson.ts      # GeoJSON type re-exports
├── README.md           # Auto-generated documentation
└── __tests__/          # Test files
    ├── fetcher.test.ts
    ├── transformer.test.ts
    └── validator.test.ts
```

#### Enhanced Example Session
```bash
$ npm run tp generate:datasource

🚀 Toronto Pulse Data Source Generator
This will create a new data source plugin

? Data source name: Beach Water Quality Toronto
? Domain: environment
? API URL: https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search?resource_id=beach-data
? API Type: json
? If the data is nested, what is the property name containing the array? result.records
? Refresh interval (minutes): 60
? Generate test files? Yes
? Layer ID: beach-water-quality
? Replace existing implementation? No

🔗 Integrating plugin "beach-water-quality-toronto" with layer "beach-water-quality"...
✅ Updated useDataLayer.ts with mapping: beach-water-quality -> beach-water-quality-toronto
✅ Updated plugin loader with: environment/beach-water-quality-toronto
✅ Generated TypeScript helper types in types/ directory
⚠️  Legacy implementation detected in dataService.ts

🧪 Recommended next steps:
   1. Run: npm run tp test:datasource beach-water-quality-toronto --validate
   2. Run: npm run tp verify:integration --plugin="beach-water-quality-toronto"
   3. Test in browser with layer "beach-water-quality" enabled
   4. Verify no legacy API calls in console logs

✅ Data source plugin "beach-water-quality-toronto" generated and integrated successfully!
```

---

### 2. `test:datasource` - Plugin Testing

Comprehensive testing framework for validating plugin functionality.

#### Usage
```bash
# Basic testing
npm run tp test:datasource <plugin-id>

# With validation
npm run tp test:datasource <plugin-id> --validate

# Verbose output
npm run tp test:datasource <plugin-id> --validate --verbose
```

#### Examples
```bash
# Test TTC plugin
npm run tp test:datasource ttc-vehicles --validate

# Test Bike Share plugin with detailed output
npm run tp test:datasource bike-share-toronto --validate --verbose
```

#### Test Coverage
1. **Plugin Loading** - Instantiation and metadata validation
2. **Configuration** - JSON schema and required fields
3. **API Connectivity** - Network access and response validation
4. **Data Fetching** - Real API data retrieval
5. **Data Transformation** - GeoJSON conversion
6. **Data Validation** - Business rules and data quality
7. **Plugin Lifecycle** - Load/unload/enable/disable methods

#### Sample Output
```bash
🧪 Testing Data Source: bike-share-toronto

📊 Test Results:
✅ Plugin loading: PASSED (45ms)
✅ Configuration validation: PASSED (12ms)
❌ API connectivity: FAILED (404 error - expected for GBFS)
✅ Data fetching: PASSED (1.2s) - 897 stations
✅ Data transformation: PASSED (156ms) - 897 features
✅ Data validation: PASSED (89ms) - 328 warnings

📈 Performance Metrics:
   Total test time: 1.5s
   Data points: 897
   Success rate: 83%

⚠️  Validation Warnings:
   • Station 45 (Queens Quay): No bikes available but accepting rentals
   • Station 132 (Spadina): No docks available but accepting returns
   [... 326 more warnings]

✅ Overall Status: PASSED with warnings
```

---

### 3. `verify:integration` - Integration Verification *(Enhanced)*

Verifies that plugins are properly integrated with the layer system and validates complete data flow pipelines.

#### Usage
```bash
# Verify all integrations with full data flow testing
npm run tp verify:integration --all

# Verify specific plugin with data flow validation
npm run tp verify:integration --plugin="bike-share-toronto"

# Verify specific layer
npm run tp verify:integration --layer="bike-share"

# Auto-fix issues
npm run tp verify:integration --all --fix
```

#### ✨ Enhanced Features (Post-Improvement)
- **Complete Data Flow Testing**: Runs fetch → transform → validate pipeline
- **Performance Metrics**: Measures timing for each step
- **Type Compatibility Checks**: Validates data structure at each transformation
- **Granular Reporting**: Detailed success/warning/error breakdown

#### What It Checks
1. **Plugin Loading** - All plugins load successfully
2. **Layer Mappings** - useDataLayer.ts routing configuration
3. **Layer Configurations** - Layer config files match plugins
4. **Legacy Implementations** - Detects outdated methods
5. **Data Flow Pipeline** - Full fetch → transform → validate sequence
6. **Type Compatibility** - Ensures transformer output matches validator input

#### Enhanced Sample Output
```bash
🔍 Toronto Pulse Integration Verifier
Checking data source plugin integration...

📦 Loading plugins...
✅ Loaded 3 plugins

🗺️  Checking layer mappings...
⚙️  Checking layer configurations...
🏚️  Checking for legacy implementations...
🌐 Testing plugin connectivity & data flow...
   ttc-vehicles: fetching... fetched transformed ok (1.2s)
   bike-share-toronto: fetching... fetched transformed ok (0.8s)
   road-restrictions: fetching... fetched transformed validation failed (0.5s)

📊 Verification Results:
✅ Successes: 6
⚠️  Warnings: 1
❌ Issues: 1

✅ Successes:
   ✅ Plugin "ttc-vehicles" properly mapped
   ✅ Plugin "bike-share-toronto" properly mapped
   ✅ Plugin "road-restrictions" properly mapped
   ✅ Plugin "ttc-vehicles" connectivity & data flow verified (fetch: 450ms, transform: 120ms)
   ✅ Plugin "bike-share-toronto" connectivity & data flow verified (fetch: 320ms, transform: 89ms)
   ✅ Plugin "road-restrictions" connectivity & data flow verified (fetch: 280ms, transform: 95ms)

⚠️  Warnings:
   ⚠️  Plugin "road-restrictions" may not have layer configuration

❌ Issues:
   ❌ Plugin "road-restrictions" validation failed: Expected array of items inside property "result.records"

💡 Run with --fix to automatically resolve issues where possible
```

---

### 4. `validate:all` - Bulk Validation

Validates all existing plugins for structure, configuration, and compliance.

#### Usage
```bash
# Validate all plugins
npm run tp validate:all

# Auto-fix issues
npm run tp validate:all --fix
```

#### Validation Checks
- File structure completeness
- Configuration schema compliance
- TypeScript code analysis
- Plugin class interface implementation
- Required method presence
- Type compatibility between components

---

### 5. `discover:datasets` - Dataset Discovery

Discovers new Toronto Open Data datasets suitable for plugin generation.

#### Usage
```bash
# Discover all datasets
npm run tp discover:datasets

# Filter by domain
npm run tp discover:datasets --domain="transportation"

# Geographic data only
npm run tp discover:datasets --geo-only
```

#### Sample Output
```bash
🔍 Discovering Toronto Open Data datasets...

📊 Found 847 datasets

🌍 Geographic Datasets (127 total):

Transportation (23 datasets):
├── 🚌 TTC Bus Delays - Real-time delays (JSON API) ⚡ Auto-generatable
├── 🚗 Traffic Signals - Location and timing (GeoJSON) ⚡ Auto-generatable  
├── 🛣️  Road Restrictions - Current closures (CKAN API) ⚡ Auto-generatable
└── 🚲 Cycling Network - Bike lanes and paths (Shapefile)

Environment (31 datasets):
├── 🌊 Beach Water Quality - Testing results (SOCRATA) ⚡ Auto-generatable
├── 🌡️  Air Quality - Monitoring stations (JSON API) ⚡ Auto-generatable
└── 🌳 Tree Inventory - Urban forest data (CSV)

💡 Tip: Use 'npm run tp generate:datasource' to create plugins for ⚡ auto-generatable datasets
```

---

## 🔄 Enhanced Workflows

### New Data Source Workflow (Improved)

#### 1. **Discovery Phase**
```bash
# Find suitable datasets
npm run tp discover:datasets --domain="infrastructure" --geo-only

# Research API documentation and data structure
```

#### 2. **Generation Phase (Enhanced)**
```bash
# Generate plugin with schema inference
npm run tp generate:datasource \
  --name="Traffic Signals Toronto" \
  --domain="infrastructure" \
  --url="https://api.toronto.ca/traffic/signals"

# CLI now prompts for:
# - Nested array property (e.g., "result.records")
# - API structure details
# - Type safety preferences
```

#### 3. **Development Phase (Improved)**
```bash
# Test the generated plugin with enhanced validation
npm run tp test:datasource traffic-signals-toronto --validate --verbose

# Verify complete data flow integration
npm run tp verify:integration --plugin="traffic-signals-toronto"

# Customize generated types in types/raw.ts
# Implement specific logic in fetcher.ts, transformer.ts, validator.ts
```

#### 4. **Integration Phase (Enhanced)**
```bash
# Comprehensive integration verification
npm run tp verify:integration --plugin="traffic-signals-toronto"

# Test in browser with automatic layer mapping
# 1. Start dev server: npm run dev
# 2. Enable the layer in dashboard (auto-mapped)
# 3. Verify data appears on map
# 4. Check console for errors (enhanced error reporting)
```

#### 5. **Quality Assurance (Improved)**
```bash
# Run full test suite with type checking
npm run test -- core/data-sources

# Validate all plugins with enhanced checks
npm run tp validate:all

# Final integration check with data flow validation
npm run tp verify:integration --all
```

### Troubleshooting Workflow (Enhanced)

#### Plugin Not Showing on Map
```bash
# Enhanced integration check with data flow testing
npm run tp verify:integration --plugin="your-plugin-id"

# Verify plugin loads and data flows correctly
npm run tp test:datasource your-plugin-id --validate

# Check browser console for enhanced error messages
# Look for "Plugin not found", layer routing issues, or data flow failures
```

#### Data Validation Failures (New)
```bash
# Run detailed validation with nested array support
npm run tp test:datasource your-plugin-id --validate --verbose

# Check transformer.ts for proper nested array extraction
# Verify validator.ts expects transformed GeoJSON, not raw API data
# Adjust arrayProperty in config if API structure changed
```

#### Type Compatibility Issues (New)
```bash
# Check generated types in types/ directory
# Verify raw.ts matches actual API response
# Ensure transformer output matches GeoJSON types
# Run TypeScript compilation to catch type errors early
```

#### Legacy API Still Being Called
```bash
# Enhanced legacy detection
npm run tp verify:integration --all

# Look for warnings about dataService.ts methods
# Update useDataLayer.ts if needed
# Remove or comment out legacy fetch methods
```

---

## 🏗️ Enhanced Plugin Architecture

### Plugin Structure (Updated)
```typescript
// config.json - Enhanced plugin configuration
{
  "metadata": {
    "id": "your-plugin-id",
    "name": "Your Plugin Name",
    "domain": "transportation|infrastructure|environment|events",
    "version": "1.0.0",
    "description": "Plugin description",
    "refreshInterval": 60000,
    "reliability": "high|medium|low"
  },
  "api": {
    "type": "json|xml|csv",
    "baseUrl": "https://api.example.com",
    "endpoints": { ... },
    "authentication": null,
    "rateLimit": { ... }
  },
  "transform": {
    "arrayProperty": "result.records", // NEW: Nested array path
    "mappings": { ... }
  },
  "visualization": { ... },
  "cache": { ... }
}
```

### Implementation Classes (Enhanced)
```typescript
// types/raw.ts - NEW: API response types
export interface RawItem {
  // TODO: Describe the fields returned by the API
  id: string;
  latitude: number;
  longitude: number;
  // ... other fields
}

export type RawApiResponse = RawItem[] | Record<string, any>;

// types/geojson.ts - NEW: GeoJSON type helpers
export { GeoJSONFeature, GeoJSONFeatureCollection } from '../../../../types/geojson.js';

// fetcher.ts - Data retrieval (unchanged)
export class YourPluginFetcher implements DataFetcher {
  async fetch(): Promise<RawApiResponse> {
    // Implement API calls with proper typing
  }
}

// transformer.ts - Enhanced GeoJSON conversion
export class YourPluginTransformer implements DataTransformer {
  transform(data: RawApiResponse): GeoJSONFeatureCollection {
    // Auto-generated nested array extraction logic
    let items: any = data;
    if (typeof data === 'object' && !Array.isArray(data)) {
      items = data['result.records']; // From arrayProperty config
    }

    if (!Array.isArray(items)) {
      throw new Error('Expected array of items inside property "result.records"');
    }

    const features = items.map(item => this.createFeature(item));
    return { type: 'FeatureCollection', features };
  }
}

// validator.ts - Enhanced data quality with nested array support
export class YourPluginValidator implements DataValidator {
  validate(data: GeoJSONFeatureCollection): ValidationResult {
    // Validates transformed GeoJSON, not raw API data
    // Includes geographic bounds checking for Toronto
    // Enhanced error reporting and warnings
  }
}
```

---

## 🔧 Advanced Configuration

### Custom Layer Integration (Simplified)

The CLI now automatically handles layer integration, but for custom mappings:

```typescript
// src/hooks/useDataLayer.ts - Auto-updated by CLI
const getPluginId = (layerId: string): string => {
  switch (layerId) {
    case 'bike-share':
      return 'bike-share-toronto';
    case 'your-layer-id':
      return 'your-plugin-id'; // Auto-added by CLI
    default:
      return layerId;
  }
};
```

### Enhanced API-Specific Templates

The CLI generates different templates based on API type and nested structure:

#### JSON APIs with Nested Arrays (Enhanced)
- Automatic nested array extraction based on `arrayProperty`
- Type-safe property access
- Enhanced error handling for missing properties

#### XML APIs (Enhanced)
- XML parsing with nested structure support
- Namespace handling improvements
- Better attribute extraction logic

#### CSV APIs (Enhanced)
- CSV parsing with nested object support
- Enhanced column mapping
- Improved data type conversion

---

## 🚨 Enhanced Troubleshooting

### Common Issues (Updated)

#### "Plugin not found" Error
```bash
# Enhanced integration check with data flow validation
npm run tp verify:integration --plugin="your-plugin-id"

# Verify plugin is registered and data flows correctly
npm run tp test:datasource your-plugin-id --validate
```

#### TypeScript Compilation Errors (New)
```bash
# Validate plugin structure and types
npm run tp validate:all

# Check generated types in types/ directory
# Verify interface implementations match expected signatures
```

#### Data Flow Validation Failures (New)
```bash
# Test complete data pipeline
npm run tp verify:integration --plugin="your-plugin-id"

# Check transformer output matches validator input
# Verify arrayProperty configuration for nested APIs
# Ensure GeoJSON structure is correct
```

#### Performance Issues (Enhanced)
```bash
# Check data size and processing time with detailed metrics
npm run tp test:datasource your-plugin-id --verbose

# Review fetch, transform, and validate timing
# Consider caching strategies and data optimization
```

### Enhanced Debug Mode

For detailed debugging, use verbose mode with data flow validation:
```bash
npm run tp verify:integration --plugin="your-plugin-id" --verbose
```

This provides:
- Complete data flow pipeline testing
- Detailed timing information for each step
- Raw API responses and transformation results
- Validation details with specific error locations
- Type compatibility verification
- Performance metrics and bottleneck identification

---

## 📊 Enhanced Best Practices

### 1. **Plugin Development (Updated)**
- Use generated TypeScript types in `types/` directory
- Follow strict typing with proper interfaces
- Implement comprehensive error handling
- Leverage arrayProperty for nested API responses
- Validate transformed GeoJSON, not raw API data

### 2. **API Integration (Enhanced)**
- Specify arrayProperty during generation for nested APIs
- Use appropriate cache strategies based on data freshness
- Implement proper timeout and retry logic
- Handle API versioning and structure changes
- Monitor API health with enhanced verification

### 3. **Data Quality (Improved)**
- Validate GeoJSON output structure
- Check geographic bounds for Toronto area
- Implement business logic validation on transformed data
- Provide meaningful error messages and warnings
- Use enhanced validation framework for quality metrics

### 4. **Performance (Enhanced)**
- Monitor fetch, transform, and validate timing separately
- Use appropriate cache TTL values based on data type
- Optimize data transformation with efficient algorithms
- Minimize memory usage during processing
- Leverage performance metrics from verification tools

### 5. **Testing (Comprehensive)**
- Test with real API data using enhanced test framework
- Validate complete data flow pipeline
- Check error conditions and edge cases
- Monitor performance metrics and regression
- Verify map visualization with integration tools

---

## 🔮 Future Enhancements

### Planned Features
1. **Advanced Type Inference** - Automatic API schema detection
2. **Plugin Hot Reload** - Dynamic loading without restart
3. **Web Interface** - Browser-based plugin management
4. **Auto-Deployment** - CI/CD integration with validation
5. **Plugin Marketplace** - Community plugin sharing
6. **Multi-City Support** - Extend beyond Toronto
7. **Machine Learning Integration** - Data quality prediction

### Contributing
To contribute new features or improvements:

1. Fork the repository
2. Create feature branch
3. Add CLI commands in `src/tools/cli/commands/`
4. Update type definitions and generators
5. Add comprehensive tests
6. Update documentation
7. Submit pull request

---

## 📚 Additional Resources

### API Documentation
- [Toronto Open Data Portal](https://open.toronto.ca/)
- [TTC GTFS-RT Feed](https://www.ttc.ca/information-for-developers)
- [Bike Share GBFS API](https://tor.publicbikesystem.net/ube/gbfs/v1/en/)

### Plugin Examples
- `src/domains/transportation/ttc-vehicles/` - XML API with real-time data
- `src/domains/transportation/bike-share-toronto/` - GBFS API with nested structure
- `src/domains/infrastructure/road-restrictions/` - CKAN API with nested arrays

### Architecture Documentation
- `IdealArchitecture.mdx` - System architecture overview
- `MigrationPlan.mdx` - Migration strategy and phases
- `Phase3-Summary.md` - CLI development details
- `cli-tool-improvement-plan.mdx` - Recent enhancement details

---

## 🎯 Quick Reference (Updated)

```bash
# Generate new plugin with enhanced features
npm run tp generate:datasource

# Test plugin with comprehensive validation
npm run tp test:datasource <plugin-id> --validate --verbose

# Verify integration with data flow testing
npm run tp verify:integration --plugin="<plugin-id>"

# Validate all plugins with enhanced checks
npm run tp validate:all

# Discover datasets with auto-generation support
npm run tp discover:datasets --geo-only

# Complete enhanced workflow
npm run tp generate:datasource && \
npm run tp test:datasource <plugin-id> --validate && \
npm run tp verify:integration --plugin="<plugin-id>" && \
echo "✅ Plugin ready for production!"
```

---

*This CLI toolkit was developed in Phase 3, enhanced in Phase 4, and significantly improved with comprehensive data flow validation, type safety enforcement, and automated integration verification. It transforms data source development from a complex, error-prone process into a streamlined, type-safe workflow with comprehensive quality assurance.* 