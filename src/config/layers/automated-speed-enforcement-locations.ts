import { LayerConfig } from '../types.js';

export const automatedSpeedEnforcementLocationsLayerConfig: LayerConfig = {
  id: 'automated-speed-enforcement-locations',
  name: 'Automated Speed Enforcement Locations',
  description: 'Automated Speed Enforcement (ASE) is an automated system that uses a camera and a speed measurement
device to detect and capture images of vehicles travelling in excess of the posted speed limit. It is designed to
work in tandem with other methods and strategies, including engineering measures, education initiatives and
traditional police enforcement. ASE is focused on altering driver behaviour to decrease speeding and increase
safety.

This dataset includes the active and planned locations of City of Toronto's Automated Speed Enforcement
systems by latitude and longitude.

For a list of historical locations, please visit the Automated Speed Enforcement website or contact us at the
email listed.',
  enabled: true,
  refreshInterval: 604800000,
  metadata: {
    domain: 'infrastructure',
    dataType: 'geospatial',
    updateFrequency: 'unknown',
    reliability: 'high',
    tags: ["driving","enforcement","speed"],
    lastUpdated: new Date().toISOString()
  },
  visualization: {
    layer: {
      type: 'circle',
      paint: {
      "circle-radius": [
            "interpolate",
            [
                  "linear"
            ],
            [
                  "zoom"
            ],
            8,
            4,
            12,
            6,
            16,
            8
      ],
      "circle-color": "#dc2626",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.8
},
      layout: {}
    },
    popup: {
      template: 'automated-speed-enforcement-locations-popup',
      fields: [
  "id",
  "name",
  "Location_Code",
  "location",
  "_id",
  "ward",
  "Status",
  "FID",
  "geometry"
]
    }
  },
  zoom: {
    min: 8,
    max: 18,
    default: 11
  }
};