# Bike Share Toronto Data Source

Bike Share Toronto data source for Toronto Pulse

## Configuration

- **Domain**: transportation
- **API Type**: JSON
- **Refresh Interval**: 60 seconds
- **Reliability**: high

## API Details

- **Endpoint**: https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information
- **Format**: JSON

## Development

### Testing

```bash
npm run tp test:datasource bike-share-toronto
```

### Implementation Notes

1. **Fetcher**: Implement the data fetching logic in `fetcher.ts`
2. **Transformer**: Convert the API response to GeoJSON in `transformer.ts`
3. **Validator**: Add data quality checks in `validator.ts`

### TODO

- [ ] Implement fetcher logic for JSON API
- [ ] Map API fields to GeoJSON properties in transformer
- [ ] Add specific validation rules for data quality
- [ ] Write comprehensive tests
- [ ] Add error handling and retry logic

## Tags

transportation, toronto, real-time
