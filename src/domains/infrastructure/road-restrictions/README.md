# Road Restrictions Data Source

Road Restrictions data source for Toronto Pulse

## Configuration

- **Domain**: infrastructure
- **API Type**: JSON
- **Refresh Interval**: 60 seconds
- **Reliability**: high

## API Details

- **Endpoint**: https://secure.toronto.ca/opendata/cart/road_restrictions/v3?format=json
- **Format**: JSON

## Development

### Testing

```bash
npm run tp test:datasource road-restrictions
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

infrastructure, toronto, real-time
