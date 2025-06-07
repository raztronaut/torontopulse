# Toronto Beaches Observations Data Source

Toronto Beaches Observations data source for Toronto Pulse

## Configuration

- **Domain**: environment
- **API Type**: JSON
- **Refresh Interval**: 86400 seconds
- **Reliability**: high

## API Details

- **Endpoint**: https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=${packageId
- **Format**: JSON

## Development

### Testing

```bash
npm run tp test:datasource toronto-beaches-observations
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

environment, toronto, real-time
