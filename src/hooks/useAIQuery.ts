import { useState, useCallback } from 'react';
import { AIQueryService, QueryResult } from '../core/ai/query-service';
import { PluginDataService } from '../core/data-sources/service';
import { DataSourceRegistry } from '../core/data-sources/registry';
import { PluginLoader } from '../core/data-sources/loader';

interface AIQueryState {
  isLoading: boolean;
  result: QueryResult | null;
  error: string | null;
  history: Array<{
    query: string;
    result: QueryResult;
    timestamp: Date;
  }>;
}

export function useAIQuery() {
  const [state, setState] = useState<AIQueryState>({
    isLoading: false,
    result: null,
    error: null,
    history: []
  });

  // Initialize services (in a real app, these would be provided via context)
  const initializeServices = useCallback(async () => {
    const registry = new DataSourceRegistry();
    const dataService = new PluginDataService(registry);
    const loader = new PluginLoader(registry);
    
    // Load all available plugins
    await loader.loadAllPlugins();
    
    return new AIQueryService(dataService, registry);
  }, []);

  const executeQuery = useCallback(async (query: string) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter a query' }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null 
    }));

    try {
      const aiService = await initializeServices();
      const result = await aiService.processQuery(query);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        result,
        history: [
          ...prev.history,
          {
            query,
            result,
            timestamp: new Date()
          }
        ].slice(-10) // Keep last 10 queries
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, [initializeServices]);

  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      history: [],
      result: null,
      error: null
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    executeQuery,
    clearHistory,
    clearError
  };
} 