# Red Light Cameras Data Source

Red Light Camera (RLC) is an automated system which photographs vehicles that run red lights. Generally, the camera is triggered when a vehicle enters the intersection (passes the stop-bar) after the traffic signal has turned red. The camera will take two time-stamped photographs of the vehicle: one is taken as the vehicle approaches the stop line and the second is taken as the vehicle moves through the intersection. RLC is focused on altering driver behaviour to eliminate red-light running and increase safety for all road users. 

This dataset identifies the intersections in Toronto where Red Light Cameras are located.

For a list of historical (including de-commissioned) locations, please visit the Red Light Camera website or contact us at the email listed.



## Configuration

- **Domain**: infrastructure
- **API Type**: JSON
- **Refresh Interval**: 300 seconds
- **Reliability**: high

## API Details

- **Endpoint**: /api/toronto-open-data/api/3/action/datastore_search?resource_id=b57a31a1-5ee6-43e3-bfb9-206ebe93066d
- **Format**: JSON

## Development

### Testing

```bash
npm run tp test:datasource red-light-cameras
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


