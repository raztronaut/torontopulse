export const AI_CONFIG = {
  // Anthropic Configuration
  anthropic: {
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
    model: 'claude-3-haiku-20240307', // Fast and cost-effective model
    maxTokens: 1000,
    temperature: 0.1, // Low temperature for consistent, factual responses
  },
  
  // Query Processing Settings
  query: {
    maxRetries: 3,
    timeoutMs: 30000, // 30 seconds
    maxHistoryItems: 10,
    maxDataPoints: 1000, // Limit data points for performance
  },
  
  // Feature Flags
  features: {
    enableQueryHistory: true,
    enableFollowUpSuggestions: true,
    enableLocationGeocoding: true,
    enableCaching: true,
  },
  
  // Error Messages
  errors: {
    noApiKey: 'Anthropic API key is not configured. Please add VITE_ANTHROPIC_API_KEY to your environment variables.',
    queryTimeout: 'Query timed out. Please try a simpler question.',
    rateLimitExceeded: 'Too many requests. Please wait a moment and try again.',
    invalidQuery: 'Unable to understand the query. Please try rephrasing your question.',
  }
};

// Validation function
export function validateAIConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!AI_CONFIG.anthropic.apiKey) {
    errors.push(AI_CONFIG.errors.noApiKey);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
} 