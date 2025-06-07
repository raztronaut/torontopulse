# Toronto Pulse CLI Documentation

## 🚀 Overview

The Toronto Pulse CLI is a comprehensive developer toolkit for managing data source plugins, providing an end-to-end workflow from plugin generation to production deployment. Built during Phase 3 and enhanced in Phase 4, it transforms data source development from hours to minutes.

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
```

---

## 🛠️ Core Commands

### 1. `generate:datasource` - Plugin Generation

Creates a complete data source plugin with automatic integration.

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

#### What Gets Generated
```
src/domains/{domain}/{plugin-name}/
├── config.json          # Plugin configuration
├── index.ts             # Main plugin class
├── fetcher.ts           # Data fetching logic
├── transformer.ts       # Data transformation
├── validator.ts         # Data validation
├── README.md           # Auto-generated documentation
└── __tests__/          # Test files
    ├── fetcher.test.ts
    ├── transformer.test.ts
    └── validator.test.ts
```

#### ✨ Phase 4 Enhancements
- **Automatic Layer Integration**: Updates `useDataLayer.ts` mapping
- **Plugin Loader Registration**: Adds to known plugins list
- **Legacy Detection**: Warns about existing implementations
- **Guided Next Steps**: Provides testing and verification commands

#### Example Session
```bash
$ npm run tp generate:datasource

🚀 Toronto Pulse Data Source Generator
This will create a new data source plugin

? Data source name: Beach Water Quality Toronto
? Domain: environment
? API URL: https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search?resource_id=beach-data
? API Type: json
? Refresh interval (minutes): 60
? Generate test files? Yes
? Layer ID: beach-water-quality
? Replace existing implementation? No

🔗 Integrating plugin "beach-water-quality-toronto" with layer "beach-water-quality"...
✅ Updated useDataLayer.ts with mapping: beach-water-quality -> beach-water-quality-toronto
✅ Updated plugin loader with: environment/beach-water-quality-toronto
⚠️  Legacy implementation detected in dataService.ts

🧪 Recommended next steps:
   1. Run: npm run tp test:datasource beach-water-quality-toronto --validate
   2. Run: npm run test -- core/data-sources
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

### 3. `verify:integration` - Integration Verification *(Phase 4 New)*

Verifies that plugins are properly integrated with the layer system and map visualization.

#### Usage
```bash
# Verify all integrations
npm run tp verify:integration --all

# Verify specific plugin
npm run tp verify:integration --plugin="bike-share-toronto"

# Verify specific layer
npm run tp verify:integration --layer="bike-share"

# Auto-fix issues
npm run tp verify:integration --all --fix
```

#### What It Checks
1. **Plugin Loading** - All plugins load successfully
2. **Layer Mappings** - useDataLayer.ts routing configuration
3. **Layer Configurations** - Layer config files match plugins
4. **Legacy Implementations** - Detects outdated methods
5. **Plugin Connectivity** - Basic connectivity tests

#### Sample Output
```bash
🔍 Toronto Pulse Integration Verifier
Checking data source plugin integration...

📦 Loading plugins...
✅ Loaded 2 plugins

🗺️  Checking layer mappings...
⚙️  Checking layer configurations...
🏚️  Checking for legacy implementations...
🌐 Testing plugin connectivity...

📊 Verification Results:
✅ Successes: 4
⚠️  Warnings: 0
❌ Issues: 0

✅ Successes:
   ✅ Plugin "ttc-vehicles" properly mapped
   ✅ Plugin "bike-share-toronto" properly mapped
   ✅ Plugin "ttc-vehicles" connectivity verified
   ✅ Plugin "bike-share-toronto" connectivity verified

🎉 All integrations verified successfully!
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

## 🔄 Workflows

### New Data Source Workflow

#### 1. **Discovery Phase**
```bash
# Find suitable datasets
npm run tp discover:datasets --domain="infrastructure" --geo-only

# Research API documentation and data structure
```

#### 2. **Generation Phase**
```bash
# Generate plugin with automatic integration
npm run tp generate:datasource \
  --name="Traffic Signals Toronto" \
  --domain="infrastructure" \
  --url="https://api.toronto.ca/traffic/signals"
```

#### 3. **Development Phase**
```bash
# Test the generated plugin
npm run tp test:datasource traffic-signals-toronto --validate

# Customize fetcher.ts, transformer.ts, validator.ts as needed
# Run tests after changes
npm run tp test:datasource traffic-signals-toronto --validate --verbose
```

#### 4. **Integration Phase**
```bash
# Verify integration with map system
npm run tp verify:integration --plugin="traffic-signals-toronto"

# Test in browser
# 1. Start dev server: npm run dev
# 2. Enable the layer in dashboard
# 3. Verify data appears on map
# 4. Check console for errors
```

#### 5. **Quality Assurance**
```bash
# Run full test suite
npm run test -- core/data-sources

# Validate all plugins
npm run tp validate:all

# Final integration check
npm run tp verify:integration --all
```

### Troubleshooting Workflow

#### Plugin Not Showing on Map
```bash
# Check integration
npm run tp verify:integration --plugin="your-plugin-id"

# Verify plugin loads
npm run tp test:datasource your-plugin-id

# Check browser console for errors
# Look for "Plugin not found" or layer routing issues
```

#### Data Validation Failures
```bash
# Run detailed validation
npm run tp test:datasource your-plugin-id --validate --verbose

# Check validator.ts logic
# Verify API response format matches expectations
# Adjust validation rules if needed
```

#### Legacy API Still Being Called
```bash
# Check for legacy implementations
npm run tp verify:integration --all

# Look for warnings about dataService.ts methods
# Update useDataLayer.ts if needed
# Remove or comment out legacy fetch methods
```

---

## 🏗️ Plugin Architecture

### Plugin Structure
```typescript
// config.json - Plugin configuration
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
  "transform": { ... },
  "visualization": { ... },
  "cache": { ... }
}
```

### Implementation Classes
```typescript
// fetcher.ts - Data retrieval
export class YourPluginFetcher implements DataFetcher {
  async fetch(): Promise<YourDataType[]> {
    // Implement API calls
  }
}

// transformer.ts - GeoJSON conversion
export class YourPluginTransformer implements DataTransformer {
  transform(data: YourDataType[]): FeatureCollection {
    // Convert to GeoJSON for map visualization
  }
}

// validator.ts - Data quality
export class YourPluginValidator implements DataValidator {
  validate(data: YourDataType[]): ValidationResult {
    // Implement business rules and data quality checks
  }
}

// index.ts - Main plugin class
export class YourPlugin extends BaseDataSourcePlugin {
  constructor() {
    super(
      new YourPluginFetcher(),
      new YourPluginTransformer(),
      new YourPluginValidator()
    );
  }
}
```

---

## 🔧 Advanced Configuration

### Custom Layer Integration

If you need custom layer mapping:

```typescript
// src/hooks/useDataLayer.ts
const getPluginId = (layerId: string): string => {
  switch (layerId) {
    case 'bike-share':
      return 'bike-share-toronto';
    case 'your-layer-id':
      return 'your-plugin-id';
    default:
      return layerId;
  }
};
```

### API-Specific Templates

The CLI generates different templates based on API type:

#### JSON APIs (most common)
- Standard REST API calls
- JSON response parsing
- Error handling for HTTP status codes

#### XML APIs (TTC feeds)
- XML parsing with DOMParser
- Namespace handling
- Attribute extraction

#### CSV APIs
- CSV parsing and validation
- Column mapping
- Data type conversion

#### GTFS Feeds
- ZIP file handling
- Multi-file processing
- GTFS-specific validation

---

## 🚨 Troubleshooting

### Common Issues

#### "Plugin not found" Error
```bash
# Check plugin is registered
npm run tp verify:integration --plugin="your-plugin-id"

# Verify loader.ts includes your plugin
# Check useDataLayer.ts mapping
```

#### TypeScript Compilation Errors
```bash
# Validate plugin structure
npm run tp validate:all

# Check interface implementations
# Verify all required methods are present
```

#### Map Integration Issues
```bash
# Verify layer configuration
npm run tp verify:integration --layer="your-layer-id"

# Check console logs in browser
# Verify GeoJSON structure in transformer
```

#### Performance Issues
```bash
# Check data size and processing time
npm run tp test:datasource your-plugin-id --verbose

# Consider caching strategies
# Optimize data transformation logic
```

### Debug Mode

For detailed debugging, use verbose mode:
```bash
npm run tp test:datasource your-plugin-id --validate --verbose
```

This provides:
- Detailed timing information
- Raw API responses
- Transformation steps
- Validation details
- Error stack traces

---

## 📊 Best Practices

### 1. **Plugin Development**
- Follow TypeScript strict mode
- Implement comprehensive error handling
- Use appropriate cache strategies
- Validate geographic boundaries for Toronto
- Include meaningful validation warnings

### 2. **API Integration**
- Respect rate limits
- Implement proper timeout handling
- Use appropriate refresh intervals
- Handle API versioning changes
- Monitor API health

### 3. **Data Quality**
- Validate required fields
- Check geographic bounds
- Implement business logic validation
- Provide meaningful error messages
- Log data quality metrics

### 4. **Performance**
- Use appropriate cache TTL values
- Optimize data transformation
- Minimize memory usage
- Monitor response times
- Implement efficient data structures

### 5. **Testing**
- Test with real API data
- Validate edge cases
- Check error conditions
- Monitor performance metrics
- Verify map visualization

---

## 🔮 Future Enhancements

### Planned Features
1. **Plugin Hot Reload** - Dynamic loading without restart
2. **Web Interface** - Browser-based plugin management
3. **Auto-Deployment** - CI/CD integration
4. **Plugin Marketplace** - Community plugin sharing
5. **Advanced Monitoring** - Plugin health dashboard
6. **Multi-City Support** - Extend beyond Toronto

### Contributing
To contribute new features or templates:

1. Fork the repository
2. Create feature branch
3. Add CLI commands in `src/tools/cli/commands/`
4. Update documentation
5. Add tests
6. Submit pull request

---

## 📚 Additional Resources

### API Documentation
- [Toronto Open Data Portal](https://open.toronto.ca/)
- [TTC GTFS-RT Feed](https://www.ttc.ca/information-for-developers)
- [Bike Share GBFS API](https://tor.publicbikesystem.net/ube/gbfs/v1/en/)

### Plugin Examples
- `src/domains/transportation/ttc-vehicles/` - XML API example
- `src/domains/transportation/bike-share-toronto/` - GBFS API example

### Architecture Documentation
- `IdealArchitecture.mdx` - System architecture
- `MigrationPlan.mdx` - Migration strategy
- `Phase3-Summary.md` - CLI development details

---

## 🎯 Quick Reference

```bash
# Generate new plugin
npm run tp generate:datasource

# Test plugin
npm run tp test:datasource <plugin-id> --validate

# Verify integration
npm run tp verify:integration --all

# Validate all plugins
npm run tp validate:all

# Discover datasets
npm run tp discover:datasets --geo-only

# Full workflow
npm run tp generate:datasource && \
npm run tp test:datasource <plugin-id> --validate && \
npm run tp verify:integration --plugin="<plugin-id>"
```

---

*This CLI toolkit was developed in Phase 3 and enhanced in Phase 4 of the Toronto Pulse migration, transforming data source development from a complex, hours-long process into a streamlined, minutes-long workflow with comprehensive quality assurance and automatic integration.* 