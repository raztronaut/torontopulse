import type { FeatureCollection, Feature } from 'geojson';
import { PluginDataService } from '../data-sources/service';
import { DataSourceRegistry } from '../data-sources/registry';
import { AI_CONFIG, validateAIConfig } from '../../config/ai';

// Import global services from the hook
let globalPluginService: PluginDataService | null = null;
let globalRegistry: DataSourceRegistry | null = null;

// Function to get or create global services (matching the pattern from useDataLayerV2)
const getGlobalServices = async () => {
  if (!globalPluginService || !globalRegistry) {
    // Import the hook module to access global services
    const { usePluginService, usePluginRegistry } = await import('../../app/hooks/useDataLayerV2');
    
    // Create temporary React component context to access hooks
    // Since we can't use hooks outside React, we'll create our own global instances
    // but ensure they match the ones used in the main app
    const { DataSourceRegistry } = await import('../data-sources/registry');
    const { PluginDataService } = await import('../data-sources/service');
    const { CacheManager } = await import('../cache/strategies');
    const { PluginLoader } = await import('../data-sources/loader');
    
    if (!globalRegistry) {
      globalRegistry = new DataSourceRegistry();
    }
    if (!globalPluginService) {
      const cache = new CacheManager();
      globalPluginService = new PluginDataService(globalRegistry, cache);
      
      // Load plugins if not already loaded
      const loader = new PluginLoader(globalRegistry);
      try {
        await loader.loadAllPlugins();
        console.log('🔧 AI Service: Plugins loaded successfully');
      } catch (error) {
        console.error('❌ AI Service: Failed to load plugins:', error);
      }
    }
  }
  
  return {
    service: globalPluginService!,
    registry: globalRegistry!
  };
};

export interface QueryResult {
  summary: string;
  data: Feature[];
  visualizationHint?: 'map' | 'list' | 'chart' | 'table';
  followUpSuggestions?: string[];
  executionTime: number;
  dataSource: string[];
}

export class AIQueryService {
  private dataService: PluginDataService;
  private registry: DataSourceRegistry;

  constructor(dataService: PluginDataService, registry: DataSourceRegistry) {
    this.dataService = dataService;
    this.registry = registry;
    
    // Validate configuration on initialization
    const validation = validateAIConfig();
    if (!validation.isValid) {
      console.warn('AI Configuration issues:', validation.errors);
    }
  }

  async processQuery(query: string): Promise<QueryResult> {
    console.log('🤖 AIQueryService: Processing query:', query);
    const startTime = Date.now();
    
    try {
      const result = await processAIQuery(query, this.dataService, this.registry);
      console.log('✅ AIQueryService: Query completed in', Date.now() - startTime, 'ms');
      return result;
    } catch (error) {
      console.error('❌ AIQueryService: Error processing query:', error);
      throw new Error(`Failed to process query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Implementation of the missing processAIQuery function
export async function processAIQuery(
  query: string, 
  dataService?: PluginDataService, 
  registry?: DataSourceRegistry
): Promise<QueryResult> {
  console.log('🔍 processAIQuery: Starting with query:', query);
  const startTime = Date.now();
  
  // Validate API key
  if (!AI_CONFIG.anthropic.apiKey) {
    console.error('❌ processAIQuery: No Anthropic API key found');
    throw new Error(AI_CONFIG.errors.noApiKey);
  }

  try {
    // Use global services if not provided
    if (!dataService || !registry) {
      console.log('🔧 processAIQuery: Using global plugin services...');
      const globalServices = await getGlobalServices();
      dataService = globalServices.service;
      registry = globalServices.registry;
    }

    // Step 1: Analyze the query to determine which data sources to use
    console.log('🧠 processAIQuery: Analyzing query to determine data sources...');
    const relevantSources = analyzeQueryForDataSources(query);
    console.log('📊 processAIQuery: Relevant data sources:', relevantSources);

    // Step 2: Fetch real data from the identified sources
    console.log('📡 processAIQuery: Fetching data from sources...');
    const sourceData = await dataService.fetchMultipleSources(relevantSources);
    console.log('✅ processAIQuery: Fetched data from', Object.keys(sourceData).length, 'sources');

    // Step 3: Process and filter the data based on the query
    console.log('🔍 processAIQuery: Processing and filtering data...');
    const filteredFeatures = processDataForQuery(query, sourceData);
    console.log('✅ processAIQuery: Filtered to', filteredFeatures.length, 'relevant features');

    // Step 4: Generate AI summary of the results
    console.log('🤖 processAIQuery: Generating AI summary...');
    const aiSummary = await generateAISummary(query, filteredFeatures, Object.keys(sourceData));

    // Step 5: Generate follow-up suggestions
    const followUpSuggestions = generateFollowUpSuggestions(query, relevantSources);

    const result: QueryResult = {
      summary: aiSummary,
      data: filteredFeatures,
      visualizationHint: determineVisualizationHint(query, filteredFeatures),
      followUpSuggestions,
      executionTime: Date.now() - startTime,
      dataSource: Object.keys(sourceData)
    };

    console.log('✅ processAIQuery: Returning result with', result.data.length, 'features');
    return result;

  } catch (error) {
    console.error('❌ processAIQuery: Caught error:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('🚫 processAIQuery: Network/CORS error detected');
      throw new Error('Network error: Unable to connect to AI service. This might be a CORS issue.');
    }
    
    throw error;
  }
}

// Helper function to analyze query and determine relevant data sources
function analyzeQueryForDataSources(query: string): string[] {
  const queryLower = query.toLowerCase();
  const sources: string[] = [];

  // Map query keywords to data sources
  const sourceMapping = {
    'red light camera': ['red-light-cameras'],
    'speed camera': ['automated-speed-enforcement-locations'],
    'speed enforcement': ['automated-speed-enforcement-locations'],
    'ttc': ['ttc-vehicles'],
    'transit': ['ttc-vehicles'],
    'bus': ['ttc-vehicles'],
    'streetcar': ['ttc-vehicles'],
    'subway': ['ttc-vehicles'],
    'bike share': ['bike-share-toronto'],
    'bikeshare': ['bike-share-toronto'],
    'bicycle': ['bike-share-toronto'],
    'road closure': ['road-restrictions'],
    'road restriction': ['road-restrictions'],
    'construction': ['road-restrictions'],
    'beach': ['toronto-beaches-observations'],
    'water quality': ['toronto-beaches-observations'],
    'swimming': ['toronto-beaches-observations']
  };

  // Check for specific keywords
  for (const [keyword, dataSources] of Object.entries(sourceMapping)) {
    if (queryLower.includes(keyword)) {
      sources.push(...dataSources);
    }
  }

  // If no specific sources found, include some default ones based on common queries
  if (sources.length === 0) {
    if (queryLower.includes('king street') || queryLower.includes('queen street') || queryLower.includes('downtown')) {
      sources.push('red-light-cameras', 'automated-speed-enforcement-locations');
    } else {
      // Default to most commonly queried sources
      sources.push('red-light-cameras', 'automated-speed-enforcement-locations', 'ttc-vehicles');
    }
  }

  return [...new Set(sources)]; // Remove duplicates
}

// Helper function to process and filter data based on the query
function processDataForQuery(query: string, sourceData: Record<string, FeatureCollection>): Feature[] {
  const queryLower = query.toLowerCase();
  let allFeatures: Feature[] = [];

  // Combine all features from all sources
  for (const [sourceId, featureCollection] of Object.entries(sourceData)) {
    console.log(`🔍 processDataForQuery: Processing ${sourceId} with ${featureCollection.features.length} features`);
    
    // Log sample feature for debugging
    if (featureCollection.features.length > 0) {
      console.log(`🔍 processDataForQuery: Sample feature from ${sourceId}:`, JSON.stringify(featureCollection.features[0].properties, null, 2));
    }
    
    const featuresWithSource = featureCollection.features.map(feature => ({
      ...feature,
      properties: {
        ...feature.properties,
        sourceId
      }
    }));
    allFeatures.push(...featuresWithSource);
  }

  console.log(`🔍 processDataForQuery: Starting with ${allFeatures.length} total features`);

  // Apply location-based filtering (but make it more flexible)
  const locationFilters = extractLocationFromQuery(query);
  if (locationFilters.length > 0) {
    console.log(`🔍 processDataForQuery: Applying location filters:`, locationFilters);
    
    const beforeFilter = allFeatures.length;
    allFeatures = allFeatures.filter(feature => {
      const props = feature.properties || {};
      const searchText = JSON.stringify(props).toLowerCase();
      
      // More flexible matching - check for partial matches and common variations
      const matches = locationFilters.some(location => {
        // Direct match
        if (searchText.includes(location)) return true;
        
        // Check for street name without "street" suffix
        if (location.includes(' street')) {
          const streetName = location.replace(' street', '');
          if (searchText.includes(streetName)) return true;
        }
        
        // Check for route names that might match street names
        if (location === 'king street' && (searchText.includes('king') || searchText.includes('504'))) return true;
        if (location === 'queen street' && (searchText.includes('queen') || searchText.includes('501'))) return true;
        if (location === 'spadina' && (searchText.includes('spadina') || searchText.includes('510'))) return true;
        
        return false;
      });
      
      return matches;
    });
    
    console.log(`🔍 processDataForQuery: Location filtering: ${beforeFilter} -> ${allFeatures.length} features`);
    
    // If location filtering removes everything, be more lenient
    if (allFeatures.length === 0 && beforeFilter > 0) {
      console.log(`🔍 processDataForQuery: Location filter too strict, using all features`);
      allFeatures = sourceData[Object.keys(sourceData)[0]]?.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          sourceId: Object.keys(sourceData)[0]
        }
      })) || [];
    }
  }

  // Apply additional filters based on query content
  if (queryLower.includes('active') || queryLower.includes('current')) {
    // Filter for active/current items
    allFeatures = allFeatures.filter(feature => {
      const props = feature.properties || {};
      return !props.status || props.status.toLowerCase() !== 'inactive';
    });
  }

  // Limit results to prevent overwhelming the user
  const maxResults = 50;
  if (allFeatures.length > maxResults) {
    console.log(`🔍 Limiting results to ${maxResults} features (was ${allFeatures.length})`);
    allFeatures = allFeatures.slice(0, maxResults);
  }

  return allFeatures;
}

// Helper function to extract location information from query
function extractLocationFromQuery(query: string): string[] {
  const queryLower = query.toLowerCase();
  const locations: string[] = [];

  // Common Toronto street names and areas
  const torontoLocations = [
    'king street', 'queen street', 'yonge street', 'bloor street', 'dundas street',
    'college street', 'spadina', 'bathurst', 'ossington', 'dufferin',
    'downtown', 'midtown', 'uptown', 'east end', 'west end',
    'financial district', 'entertainment district', 'distillery district',
    'cn tower', 'union station', 'eaton centre', 'harbourfront'
  ];

  for (const location of torontoLocations) {
    if (queryLower.includes(location)) {
      locations.push(location);
    }
  }

  return locations;
}

// Helper function to generate AI summary using Anthropic
async function generateAISummary(query: string, features: Feature[], dataSources: string[]): Promise<string> {
  try {
    console.log(`🤖 generateAISummary: Processing ${features.length} features from sources: ${dataSources.join(', ')}`);
    
    const dataContext = features.length > 0 ? 
      `Found ${features.length} relevant items from ${dataSources.join(', ')}. Sample data: ${JSON.stringify(features.slice(0, 3).map(f => f.properties), null, 2)}` :
      `No specific data found in ${dataSources.join(', ')} for this query.`;

    console.log(`🤖 generateAISummary: Data context being sent to AI:`, dataContext);

    const response = await fetch('/api/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AI_CONFIG.anthropic.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: AI_CONFIG.anthropic.model,
        max_tokens: 300,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: `You are a Toronto city data assistant. A user asked: "${query}"

Data context: ${dataContext}

Provide a helpful, concise summary of the findings. If data was found, explain what it shows. If no data was found, explain what the user was looking for and suggest alternatives. Keep it conversational and informative.`
          }
        ]
      })
    });

    if (response.ok) {
      const aiResponse = await response.json();
      return aiResponse.content?.[0]?.text || `Found ${features.length} results for your query about ${query}.`;
    } else {
      console.warn('AI summary generation failed, using fallback');
      return generateFallbackSummary(query, features, dataSources);
    }
  } catch (error) {
    console.warn('AI summary generation error, using fallback:', error);
    return generateFallbackSummary(query, features, dataSources);
  }
}

// Fallback summary generation without AI
function generateFallbackSummary(query: string, features: Feature[], dataSources: string[]): string {
  if (features.length === 0) {
    return `No results found for "${query}" in the available data sources (${dataSources.join(', ')}). Try rephrasing your query or asking about a different area.`;
  }

  const sourceNames = dataSources.map(id => {
    const nameMap: Record<string, string> = {
      'red-light-cameras': 'Red Light Cameras',
      'automated-speed-enforcement-locations': 'Speed Cameras',
      'ttc-vehicles': 'TTC Vehicles',
      'bike-share-toronto': 'Bike Share Stations',
      'road-restrictions': 'Road Restrictions',
      'toronto-beaches-observations': 'Beach Observations'
    };
    return nameMap[id] || id;
  });

  return `Found ${features.length} results for "${query}" from ${sourceNames.join(', ')}. The data includes locations and details relevant to your query.`;
}

// Helper function to generate follow-up suggestions
function generateFollowUpSuggestions(query: string, sources: string[]): string[] {
  const suggestions: string[] = [];
  const queryLower = query.toLowerCase();

  // Source-specific suggestions
  if (sources.includes('red-light-cameras')) {
    suggestions.push('Show me speed cameras in the same area');
  }
  if (sources.includes('automated-speed-enforcement-locations')) {
    suggestions.push('Are there red light cameras nearby?');
  }
  if (sources.includes('ttc-vehicles')) {
    suggestions.push('What about bike share stations in this area?');
  }
  if (sources.includes('bike-share-toronto')) {
    suggestions.push('Show me TTC routes nearby');
  }

  // Location-based suggestions
  if (queryLower.includes('king street')) {
    suggestions.push('What about Queen Street?', 'Show me downtown traffic enforcement');
  } else if (queryLower.includes('downtown')) {
    suggestions.push('What about midtown Toronto?', 'Show me data for specific streets');
  }

  // Generic helpful suggestions
  suggestions.push('Show me all data for this area', 'What else is happening nearby?');

  return suggestions.slice(0, 3); // Limit to 3 suggestions
}

// Helper function to determine visualization hint
function determineVisualizationHint(query: string, features: Feature[]): 'map' | 'list' | 'chart' | 'table' {
  if (features.length === 0) return 'map';
  if (features.length > 20) return 'table';
  return 'map'; // Default to map for geographic data
}

// Test function to verify AI functionality
// Simplified version for direct use in components
export async function processAIQuerySimple(query: string): Promise<string> {
  try {
    const result = await processAIQuery(query);
    return result.summary;
  } catch (error) {
    console.error('❌ processAIQuerySimple: Error:', error);
    throw error;
  }
}

export async function testAIConnection(): Promise<boolean> {
  console.log('🧪 Testing AI connection...');
  
  try {
    const response = await fetch('/api/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AI_CONFIG.anthropic.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: AI_CONFIG.anthropic.model,
        max_tokens: 50,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: 'Hello, can you respond with just "AI connection successful"?'
          }
        ]
      })
    });

    console.log('🧪 Test response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ AI connection test successful:', data);
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ AI connection test failed:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ AI connection test error:', error);
    return false;
  }
} 