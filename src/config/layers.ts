import { LayerConfig, DashboardMode } from '../types';

export const LAYER_CONFIGS: LayerConfig[] = [
  {
    id: 'ttc-vehicles',
    name: 'TTC Live Vehicles',
    description: 'Real-time bus and streetcar positions via TTC XML API',
    icon: 'Bus',
    color: '#1f2937', // Dark gray
    enabled: false,
    source: 'https://webservices.umoiq.com/service/publicXMLFeed',
    refreshInterval: 30000, // 30 seconds
  },
  {
    id: 'road-restrictions',
    name: 'Road Restrictions',
    description: 'Current road closures and restrictions',
    icon: 'Construction',
    color: '#374151', // Medium gray
    enabled: false,
    source: 'https://open.toronto.ca/dataset/road-restrictions/',
    refreshInterval: 300000, // 5 minutes
  },
  {
    id: 'bike-share',
    name: 'Bike Share Stations',
    description: 'Bike share availability across the city',
    icon: 'Bike',
    color: '#4b5563', // Light gray
    enabled: false,
    source: 'https://open.toronto.ca/dataset/bike-share-toronto/',
    refreshInterval: 60000, // 1 minute
  },
  {
    id: 'beach-water-quality',
    name: 'Beach Water Quality',
    description: 'Water quality status at Toronto beaches',
    icon: 'Waves',
    color: '#6b7280', // Lighter gray
    enabled: false,
    source: 'https://open.toronto.ca/dataset/toronto-beaches-water-quality/',
    refreshInterval: 3600000, // 1 hour
  },
  {
    id: 'toronto-beaches-observations',
    name: 'Toronto Beaches Observations',
    description: 'Daily observations made by city staff on Toronto beaches including temperature, turbidity, wave action, and wildlife counts',
    icon: 'Eye',
    color: '#059669', // Emerald green
    enabled: false,
    source: 'https://open.toronto.ca/dataset/toronto-beaches-observations/',
    refreshInterval: 86400000, // 24 hours (daily data)
  },
];

export const DASHBOARD_MODES: DashboardMode[] = [
  {
    id: 'transit',
    name: 'Transit',
    description: 'Public transportation and mobility',
    icon: 'Train',
    layers: ['ttc-vehicles', 'bike-share'],
    color: '#ff0000', // Red
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    description: 'Roads, construction, and city services',
    icon: 'Building',
    layers: ['road-restrictions'],
    color: '#374151', // Medium gray
  },
  {
    id: 'environment',
    name: 'Environment',
    description: 'Environmental conditions and quality',
    icon: 'Leaf',
    layers: ['beach-water-quality', 'toronto-beaches-observations'],
    color: '#4b5563', // Light gray
  },
  {
    id: 'all',
    name: 'All Data',
    description: 'View all available data layers',
    icon: 'Globe',
    layers: ['ttc-vehicles', 'road-restrictions', 'bike-share', 'beach-water-quality', 'toronto-beaches-observations'],
    color: '#6b7280', // Lighter gray
  },
];

export const TORONTO_BOUNDS = {
  north: 43.8554,
  south: 43.5810,
  east: -79.1168,
  west: -79.6394,
};

export const DEFAULT_VIEW_STATE = {
  longitude: -79.3832,
  latitude: 43.6532,
  zoom: 11,
  pitch: 45,
  bearing: 0,
}; 