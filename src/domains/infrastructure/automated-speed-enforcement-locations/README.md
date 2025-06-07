# Automated Speed Enforcement Locations Data Source

Automated Speed Enforcement (ASE) is an automated system that uses a camera and a speed measurement
device to detect and capture images of vehicles travelling in excess of the posted speed limit. It is designed to
work in tandem with other methods and strategies, including engineering measures, education initiatives and
traditional police enforcement. ASE is focused on altering driver behaviour to decrease speeding and increase
safety.

This dataset includes the active and planned locations of City of Toronto's Automated Speed Enforcement
systems by latitude and longitude.

For a list of historical locations, please visit the Automated Speed Enforcement website or contact us at the
email listed.

## Configuration

- **Domain**: infrastructure
- **API Type**: GEOJSON
- **Refresh Interval**: 604800 seconds
- **Reliability**: high

## API Details

- **Endpoint**: https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search?resource_id=e25e9460-a0e8-469c-b9fb-9a4837ac6c1c
- **Format**: GEOJSON

## Development

### Testing

```bash
npm run tp test:datasource automated-speed-enforcement-locations
```

### Implementation Notes

1. **Fetcher**: Implement the data fetching logic in `fetcher.ts`
2. **Transformer**: Convert the API response to GeoJSON in `transformer.ts`
3. **Validator**: Add data quality checks in `validator.ts`

### TODO

- [ ] Implement fetcher logic for GEOJSON API
- [ ] Map API fields to GeoJSON properties in transformer
- [ ] Add specific validation rules for data quality
- [ ] Write comprehensive tests
- [ ] Add error handling and retry logic

## Tags

driving, enforcement, speed
