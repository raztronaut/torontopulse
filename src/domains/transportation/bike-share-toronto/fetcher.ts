import { DataFetcher } from '../../../core/data-sources/types';
import { BikeStation } from '../../../types';

/**
 * Fetcher for Bike Share Toronto
 * Bike Share Toronto data source for Toronto Pulse
 */
export class BikeShareTorontoFetcher implements DataFetcher {
  private readonly baseUrl = 'https://tor.publicbikesystem.net/ube/gbfs/v1/en';

  async fetch(): Promise<BikeStation[]> {
    try {
      // Fetch both station information and status in parallel
      const [stationInfoResponse, stationStatusResponse] = await Promise.all([
        fetch(`${this.baseUrl}/station_information`),
        fetch(`${this.baseUrl}/station_status`)
      ]);

      if (!stationInfoResponse.ok) {
        throw new Error(`Failed to fetch station information: ${stationInfoResponse.status}`);
      }
      if (!stationStatusResponse.ok) {
        throw new Error(`Failed to fetch station status: ${stationStatusResponse.status}`);
      }

      const stationInfoData = await stationInfoResponse.json();
      const stationStatusData = await stationStatusResponse.json();

      // Create a map of station status by station_id for efficient lookup
      const statusMap = new Map();
      stationStatusData.data.stations.forEach((status: any) => {
        statusMap.set(status.station_id, status);
      });

      // Combine station information with current status
      const stations: BikeStation[] = stationInfoData.data.stations
        .map((station: any) => {
          const status = statusMap.get(station.station_id);
          if (!status) {
            console.warn(`No status found for station ${station.station_id}`);
            return null;
          }

          return {
            id: station.station_id,
            name: station.name,
            latitude: station.lat,
            longitude: station.lon,
            capacity: station.capacity,
            bikes_available: status.num_bikes_available,
            docks_available: status.num_docks_available,
            is_installed: status.is_installed === 1,
            is_renting: status.is_renting === 1,
            is_returning: status.is_returning === 1,
            last_reported: new Date(status.last_reported * 1000).toISOString()
          };
        })
        .filter(Boolean); // Remove null entries

      console.log(`Fetched ${stations.length} bike share stations`);
      return stations;
    } catch (error) {
      console.error('Error fetching bike share data:', error);
      throw error;
    }
  }
}