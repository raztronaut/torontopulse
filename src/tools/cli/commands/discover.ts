import chalk from 'chalk';
import ora from 'ora';
import { DatasetInfo } from '../types.js';

export async function discoverDatasets(options: any): Promise<void> {
  console.log(chalk.blue.bold('🔍 Discovering Toronto Open Data Datasets'));
  console.log(chalk.gray('Searching for datasets with geographic data...\n'));

  const spinner = ora('Fetching datasets from Toronto Open Data...').start();

  try {
    const datasets = await fetchTorontoDatasets(options);
    spinner.succeed(`Found ${datasets.length} datasets`);

    if (datasets.length === 0) {
      console.log(chalk.yellow('⚠️  No datasets found matching your criteria'));
      return;
    }

    displayDatasets(datasets, options);
    suggestNextSteps(datasets);

  } catch (error) {
    spinner.fail(`Failed to fetch datasets: ${error}`);
  }
}

async function fetchTorontoDatasets(options: any): Promise<DatasetInfo[]> {
  // Toronto Open Data CKAN API endpoint
  const baseUrl = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action';
  
  try {
    // First, get list of all packages
    const searchUrl = `${baseUrl}/package_search?q=*:*&rows=1000`;
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error('API request was not successful');
    }

    const packages = data.result.results;
    const datasets: DatasetInfo[] = [];

    for (const pkg of packages) {
      const dataset = await analyzePackage(pkg);
      
      // Apply filters
      if (options.domain && dataset.domain !== options.domain) {
        continue;
      }
      
      if (options.geoOnly && !dataset.hasGeoData) {
        continue;
      }

      datasets.push(dataset);
    }

    // Sort by relevance (geo data first, then by recent updates)
    return datasets.sort((a, b) => {
      if (a.hasGeoData && !b.hasGeoData) return -1;
      if (!a.hasGeoData && b.hasGeoData) return 1;
      if (a.canAutoGenerate && !b.canAutoGenerate) return -1;
      if (!a.canAutoGenerate && b.canAutoGenerate) return 1;
      return 0;
    });

  } catch (error) {
    throw new Error(`Failed to fetch datasets: ${error}`);
  }
}

async function analyzePackage(pkg: any): Promise<DatasetInfo> {
  const dataset: DatasetInfo = {
    title: pkg.title || pkg.name,
    url: `https://open.toronto.ca/dataset/${pkg.name}`,
    description: pkg.notes || 'No description available',
    tags: pkg.tags?.map((tag: any) => tag.name) || [],
    format: detectFormat(pkg),
    hasGeoData: detectGeoData(pkg),
    canAutoGenerate: false,
    domain: inferDomain(pkg)
  };

  // Determine if we can auto-generate a plugin
  dataset.canAutoGenerate = canAutoGeneratePlugin(pkg);

  return dataset;
}

function detectFormat(pkg: any): string {
  const resources = pkg.resources || [];
  const formats = resources.map((r: any) => r.format?.toLowerCase()).filter(Boolean);
  
  // Priority order for formats
  const formatPriority = ['geojson', 'json', 'csv', 'xml', 'shp', 'kml'];
  
  for (const priority of formatPriority) {
    if (formats.includes(priority)) {
      return priority;
    }
  }
  
  return formats[0] || 'unknown';
}

function detectGeoData(pkg: any): boolean {
  const title = (pkg.title || '').toLowerCase();
  const description = (pkg.notes || '').toLowerCase();
  const tags = (pkg.tags || []).map((tag: any) => tag.name.toLowerCase());
  
  const geoKeywords = [
    'geographic', 'geospatial', 'gis', 'map', 'location', 'coordinate',
    'latitude', 'longitude', 'address', 'postal', 'boundary', 'polygon',
    'geojson', 'shapefile', 'kml', 'wgs84', 'utm'
  ];

  const text = `${title} ${description} ${tags.join(' ')}`;
  return geoKeywords.some(keyword => text.includes(keyword));
}

function inferDomain(pkg: any): string | undefined {
  const title = (pkg.title || '').toLowerCase();
  const description = (pkg.notes || '').toLowerCase();
  const tags = (pkg.tags || []).map((tag: any) => tag.name.toLowerCase());
  const groups = (pkg.groups || []).map((group: any) => group.name.toLowerCase());
  
  const text = `${title} ${description} ${tags.join(' ')} ${groups.join(' ')}`;

  // Transportation keywords
  if (/\b(transit|bus|subway|streetcar|ttc|go train|bike|bicycle|traffic|road|highway|parking|vehicle)\b/.test(text)) {
    return 'transportation';
  }

  // Infrastructure keywords  
  if (/\b(infrastructure|road|bridge|utility|water|sewer|construction|permit|building|facility)\b/.test(text)) {
    return 'infrastructure';
  }

  // Environment keywords
  if (/\b(environment|air quality|water quality|beach|park|tree|pollution|climate|weather|green)\b/.test(text)) {
    return 'environment';
  }

  // Events keywords
  if (/\b(event|festival|closure|emergency|incident|permit|special)\b/.test(text)) {
    return 'events';
  }

  return undefined;
}

function canAutoGeneratePlugin(pkg: any): boolean {
  const resources = pkg.resources || [];
  
  // Check if we have supported formats
  const supportedFormats = ['json', 'geojson', 'csv'];
  const hasApiAccess = resources.some((r: any) => 
    supportedFormats.includes(r.format?.toLowerCase()) && 
    r.url && 
    (r.url.includes('api') || r.url.includes('json') || r.url.includes('csv'))
  );

  // Check if it has geographic data
  const hasGeoData = detectGeoData(pkg);

  // Check if it's actively maintained (updated in last 2 years)
  const lastModified = new Date(pkg.metadata_modified || pkg.last_modified || '2020-01-01');
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const isRecent = lastModified > twoYearsAgo;

  return hasApiAccess && hasGeoData && isRecent;
}

function displayDatasets(datasets: DatasetInfo[], _options: any): void {
  console.log('\n' + chalk.blue.bold('📊 Available Datasets'));
  console.log('═'.repeat(80));

  // Group by domain
  const byDomain = datasets.reduce((acc, dataset) => {
    const domain = dataset.domain || 'other';
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(dataset);
    return acc;
  }, {} as Record<string, DatasetInfo[]>);

  for (const [domain, domainDatasets] of Object.entries(byDomain)) {
    console.log('\n' + chalk.bold.blue(`🏷️  ${domain.toUpperCase()}`));
    console.log('─'.repeat(40));

    for (const dataset of domainDatasets.slice(0, 10)) { // Show top 10 per domain
      const geoIcon = dataset.hasGeoData ? '🌍' : '📄';
      const autoIcon = dataset.canAutoGenerate ? '✨' : '';
      const formatBadge = chalk.gray(`[${dataset.format.toUpperCase()}]`);
      
      console.log(`\n${geoIcon} ${autoIcon} ${chalk.bold(dataset.title)} ${formatBadge}`);
      console.log(`   ${chalk.gray(dataset.description.slice(0, 100))}${dataset.description.length > 100 ? '...' : ''}`);
      console.log(`   ${chalk.blue('🔗')} ${dataset.url}`);
      
      if (dataset.tags.length > 0) {
        const tagList = dataset.tags.slice(0, 5).join(', ');
        console.log(`   ${chalk.yellow('🏷️')} ${tagList}${dataset.tags.length > 5 ? '...' : ''}`);
      }

      if (dataset.canAutoGenerate) {
        console.log(`   ${chalk.green('💡 Can auto-generate plugin')}`);
      }
    }

    if (domainDatasets.length > 10) {
      console.log(chalk.gray(`\n   ... and ${domainDatasets.length - 10} more datasets`));
    }
  }
}

function suggestNextSteps(datasets: DatasetInfo[]): void {
  const autoGenerateCount = datasets.filter(d => d.canAutoGenerate).length;
  
  console.log('\n' + chalk.blue.bold('💡 Next Steps'));
  console.log('─'.repeat(40));

  if (autoGenerateCount > 0) {
    console.log(chalk.green(`✨ ${autoGenerateCount} datasets can be auto-generated as plugins`));
    console.log(chalk.yellow('   Use the dataset URL to generate a plugin:'));
    console.log(chalk.gray('   npm run tp generate:datasource --url="[dataset-api-url]"'));
  }

  console.log('\n' + chalk.blue('🔍 Filter results:'));
  console.log(chalk.gray('   --domain transportation|infrastructure|environment|events'));
  console.log(chalk.gray('   --geo-only (show only datasets with geographic data)'));

  console.log('\n' + chalk.blue('📚 Learn more:'));
  console.log(chalk.gray('   Toronto Open Data: https://open.toronto.ca/'));
  console.log(chalk.gray('   API Documentation: https://docs.ckan.org/en/latest/api/'));

  console.log();
} 