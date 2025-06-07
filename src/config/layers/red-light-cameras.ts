import { LayerConfig } from '../types.js';

export const redLightCamerasLayerConfig: LayerConfig = {
  id: 'red-light-cameras',
  name: 'Red Light Cameras',
  description: 'Red Light Camera (RLC) is an automated system which photographs vehicles that run red lights. Generally, the camera is triggered when a vehicle enters the intersection (passes the stop-bar) after the traffic signal has turned red. The camera will take two time-stamped photographs of the vehicle: one is taken as the vehicle approaches the stop line and the second is taken as the vehicle moves through the intersection. RLC is focused on altering driver behaviour to eliminate red-light running and increase safety for all road users. 

This dataset identifies the intersections in Toronto where Red Light Cameras are located.

For a list of historical (including de-commissioned) locations, please visit the Red Light Camera website or contact us at the email listed.

',
  enabled: true,
  refreshInterval: 300000,
  metadata: {
    domain: 'infrastructure',
    dataType: 'geospatial',
    updateFrequency: 'daily',
    reliability: 'high',
    tags: [],
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
      template: 'red-light-cameras-popup',
      fields: [
  "id",
  "name"
]
    }
  },
  zoom: {
    min: 8,
    max: 18,
    default: 11
  }
};