export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    // Supports Point, LineString, Polygon, MultiPoint, etc. Coordinates typing kept generic for flexibility
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
} 