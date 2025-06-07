import axios from 'axios';
import { DataFetcher } from '../../../core/data-sources/types';
import { TTCVehicle } from '../../../types';

export class TTCFetcher implements DataFetcher {
  private readonly baseUrl = 'https://webservices.umoiq.com/service/publicXMLFeed';
  private readonly timeout = 10000;
  
  // Route mapping for better display names
  private routeNames = new Map([
    // Streetcar routes (500s)
    ['501', 'Queen'],
    ['502', 'Downtowner'],
    ['503', 'Kingston Rd'],
    ['504', 'King'],
    ['505', 'Dundas'],
    ['506', 'Carlton'],
    ['507', 'Long Branch'],
    ['508', 'Lake Shore'],
    ['509', 'Harbourfront'],
    ['510', 'Spadina'],
    ['511', 'Bathurst'],
    ['512', 'St. Clair'],
    ['513', 'Jane'],
    ['514', 'Cherry'],
    ['515', 'Cherry Beach'],
    // Bus routes (common ones)
    ['7', 'Bathurst'],
    ['25', 'Don Mills'],
    ['29', 'Dufferin'],
    ['32', 'Eglinton West'],
    ['35', 'Jane'],
    ['36', 'Finch West'],
    ['39', 'Finch East'],
    ['41', 'Keele'],
    ['54', 'Lawrence East'],
    ['60', 'Steeles West'],
    ['96', 'Wilson'],
    ['100', 'Flemingdon Park'],
    ['190', 'Scarborough Centre Rocket'],
    ['191', 'Highway 27 Rocket'],
    ['192', 'Airport Rocket'],
    ['196', 'York University Rocket'],
  ]);

  // Major TTC routes to fetch data for
  private majorRoutes = ['501', '504', '506', '510', '511', '512', '514', '505'];

  async fetch(): Promise<TTCVehicle[]> {
    try {
      const allVehicles: TTCVehicle[] = [];
      
      // Fetch vehicles for major routes in parallel
      const routePromises = this.majorRoutes.map(routeId => 
        this.fetchRouteVehicles(routeId)
      );
      
      const routeResults = await Promise.allSettled(routePromises);
      
      routeResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          allVehicles.push(...result.value);
        }
      });
      
      return allVehicles;
    } catch (error) {
      console.error('Error fetching TTC data:', error);
      return [];
    }
  }

  /**
   * Fetch vehicle locations for a specific route
   */
  private async fetchRouteVehicles(routeId: string): Promise<TTCVehicle[]> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          command: 'vehicleLocations',
          a: 'ttc',
          r: routeId,
          t: 0, // Get all vehicles since time 0
        },
        timeout: this.timeout,
        headers: {
          'Accept': 'application/xml, text/xml, */*',
          'Content-Type': 'application/xml',
        },
      });

      if (!response.data) {
        return [];
      }
      
      const parsedData = this.parseXMLResponse(response.data);
      return this.convertXMLToTTCVehicle(parsedData.vehicles, routeId);
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
        console.warn(`Network error for route ${routeId} - possibly CORS related`);
      }
      return [];
    }
  }

  /**
   * Parse XML response from TTC API
   */
  private parseXMLResponse(xmlText: string): any {
    try {
      // Check for errors in the XML response
      if (xmlText.includes('<Error')) {
        const errorMatch = xmlText.match(/<Error[^>]*>(.*?)<\/[eE]>/);
        if (errorMatch) {
          console.warn('TTC API returned error:', errorMatch[1]);
          return { vehicles: [], error: errorMatch[1] };
        }
      }
      
      // Simple XML parsing for vehicle data
      const vehicles: any[] = [];
      
      // Extract vehicle elements using regex (simple approach)
      const vehicleRegex = /<vehicle\s+([^>]+)\/>/g;
      let match;
      
      while ((match = vehicleRegex.exec(xmlText)) !== null) {
        const attributes = match[1];
        const vehicle: any = {};
        
        // Parse attributes
        const attrRegex = /(\w+)="([^"]+)"/g;
        let attrMatch;
        
        while ((attrMatch = attrRegex.exec(attributes)) !== null) {
          vehicle[attrMatch[1]] = attrMatch[2];
        }
        
        vehicles.push(vehicle);
      }
      
      return { vehicles };
    } catch (error) {
      console.error('Error parsing XML:', error);
      return { vehicles: [] };
    }
  }

  /**
   * Determine vehicle type based on route ID
   */
  private getVehicleType(routeId: string): 'bus' | 'streetcar' | 'subway' {
    // TTC route numbering convention:
    // 500-599: Streetcars
    // 1-199: Subway lines
    // 300-499: Bus routes
    const routeNum = parseInt(routeId);
    
    if (routeNum >= 500 && routeNum < 600) {
      return 'streetcar';
    } else if (routeNum >= 1 && routeNum < 200) {
      return 'subway';
    }
    return 'bus';
  }

  /**
   * Get direction name from direction tag
   */
  private getDirectionName(dirTag: string, routeId: string): string {
    // Direction tags are usually like "501_0_501A" or "501_1_501A"
    // The middle number indicates direction: 0 = one way, 1 = opposite way
    
    const routeNum = parseInt(routeId);
    
    // Route-specific direction mappings for major routes
    const routeDirections = new Map([
      // East-West routes
      ['501', ['Eastbound', 'Westbound']], // Queen
      ['504', ['Eastbound', 'Westbound']], // King
      ['505', ['Eastbound', 'Westbound']], // Dundas
      ['506', ['Eastbound', 'Westbound']], // Carlton
      ['512', ['Eastbound', 'Westbound']], // St. Clair
      // North-South routes
      ['510', ['Northbound', 'Southbound']], // Spadina
      ['511', ['Northbound', 'Southbound']], // Bathurst
      ['514', ['Northbound', 'Southbound']], // Cherry
      ['7', ['Northbound', 'Southbound']], // Bathurst Bus
      ['25', ['Northbound', 'Southbound']], // Don Mills
      ['29', ['Northbound', 'Southbound']], // Dufferin
      ['35', ['Northbound', 'Southbound']], // Jane
    ]);
    
    const directions = routeDirections.get(routeId);
    
    if (directions) {
      if (dirTag.includes('_0_')) {
        return directions[0];
      } else if (dirTag.includes('_1_')) {
        return directions[1];
      }
    }
    
    // Default fallback based on route number patterns
    if (routeNum >= 500 && routeNum < 600) {
      // Most streetcar routes are east-west
      return dirTag.includes('_0_') ? 'Eastbound' : 'Westbound';
    } else {
      // Most bus routes
      return dirTag.includes('_0_') ? 'Outbound' : 'Inbound';
    }
  }

  /**
   * Convert TTC XML API format to our TTCVehicle format
   */
  private convertXMLToTTCVehicle(vehicles: any[], routeId: string): TTCVehicle[] {
    const routeName = this.routeNames.get(routeId);
    
    return vehicles.map((vehicle, index) => ({
      id: vehicle.id || `vehicle_${routeId}_${index}`,
      route: routeId,
      route_name: routeName,
      direction: this.getDirectionName(vehicle.dirTag || '', routeId),
      latitude: parseFloat(vehicle.lat || 0),
      longitude: parseFloat(vehicle.lon || 0),
      vehicle_type: this.getVehicleType(routeId),
      delay: 0, // XML API doesn't provide delay directly
      timestamp: new Date().toISOString(),
      trip_id: vehicle.dirTag,
      bearing: parseFloat(vehicle.heading || 0),
      speed: parseFloat(vehicle.speedKmHr || 0),
      vehicle_label: vehicle.id,
    }));
  }
} 