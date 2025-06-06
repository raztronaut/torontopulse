export interface TTCVehicle {
  id: string;
  route: string;
  route_name?: string;
  direction: string;
  latitude: number;
  longitude: number;
  vehicle_type: 'bus' | 'streetcar' | 'subway';
  next_stop?: string;
  delay?: number;
  timestamp: string;
  // Additional fields from real TTC data
  trip_id?: string;
  stop_id?: string;
  bearing?: number;
  speed?: number;
  occupancy_status?: string;
  vehicle_label?: string;
}

export interface RoadRestriction {
  id: string;
  description: string;
  location: string;
  start_date: string;
  end_date?: string;
  severity: 'low' | 'medium' | 'high';
  coordinates: [number, number];
}

export interface BikeStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  bikes_available: number;
  docks_available: number;
  is_installed: boolean;
  is_renting: boolean;
  is_returning: boolean;
  last_reported: string;
}

export interface BeachWaterQuality {
  id: string;
  beach_name: string;
  latitude: number;
  longitude: number;
  sample_date: string;
  e_coli: number;
  beach_advisory: 'safe' | 'caution' | 'unsafe';
  publication_date: string;
}

export interface LayerConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
  source: string;
  refreshInterval?: number;
}

export interface DashboardMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  layers: string[];
  color: string;
}

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface TorontoOpenDataResponse<T> {
  success: boolean;
  result: {
    records: T[];
    total: number;
  };
}

 