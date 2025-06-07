# AI Natural Language Query Setup Guide

This guide will help you set up the AI-powered natural language query feature for Toronto Pulse.

## Prerequisites

1. **OpenAI API Key**: You'll need an OpenAI API key to use the natural language query features.
   - Sign up at [OpenAI](https://platform.openai.com/)
   - Create an API key in your dashboard
   - The system uses GPT-4o-mini for cost-effective queries

## Environment Setup

1. **Create Environment File**
   Create a `.env` file in the root directory of your project:
   ```bash
   # Mapbox token (existing)
   VITE_MAPBOX_TOKEN=your_mapbox_token_here
   
   # OpenAI API key (new)
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

2. **API Key Security**
   - Never commit your `.env` file to version control
   - The `.env` file is already in `.gitignore`
   - For production, use environment variables or secure secret management

## Features

### Natural Language Queries
The AI system can understand and process queries like:

- **Location-based**: "Show me all speed cameras on King Street"
- **Status checks**: "What's the water quality like at beaches this weekend?"
- **Route information**: "Are there any road closures affecting the TTC?"
- **Availability**: "Find bike share stations near downtown with available bikes"
- **Real-time data**: "What TTC vehicles are currently running on the 501 Queen route?"

### Data Sources Supported
- **Speed Cameras**: Automated speed enforcement locations
- **Red Light Cameras**: Traffic enforcement cameras at intersections
- **Road Restrictions**: Current road closures and construction
- **TTC Vehicles**: Live bus and streetcar positions
- **Bike Share Stations**: Real-time bike availability
- **Beach Water Quality**: Environmental observations at Toronto beaches

### AI Features
- **Intent Classification**: Understands what type of information you're looking for
- **Entity Extraction**: Identifies locations, routes, and data types from your query
- **Smart Filtering**: Applies contextual filters based on your request
- **Natural Language Summaries**: Provides conversational explanations of the data
- **Follow-up Suggestions**: Offers related queries you might be interested in

## Usage

1. **Access the AI Panel**
   - Look for the "AI City Assistant" panel in the top-left corner
   - Click to expand the interface

2. **Ask Questions**
   - Type your question in natural language
   - Use the sample queries as examples
   - Press Enter or click the send button

3. **View Results**
   - Results appear on the map with blue highlighting
   - Get a natural language summary of findings
   - Click on map markers for detailed information
   - Use follow-up suggestions for related queries

## Example Queries

### Transportation
```
"Show me TTC delays on the King streetcar"
"Find the nearest bike share station with available bikes"
"Are there road closures on my route to downtown?"
```

### Safety & Enforcement
```
"Show me all speed cameras between Queen and King"
"Where are the red light cameras on Yonge Street?"
"What traffic enforcement is active in my area?"
```

### Environment
```
"Which beaches have good water quality today?"
"Show me beach conditions for the weekend"
"What's the water temperature at Woodbine Beach?"
```

### General
```
"What's happening in the city right now?"
"Show me all data for the downtown area"
"Find everything within 1km of CN Tower"
```

## Troubleshooting

### Common Issues

1. **"OpenAI API key is not configured"**
   - Ensure `VITE_OPENAI_API_KEY` is set in your `.env` file
   - Restart the development server after adding the key

2. **"Query timed out"**
   - Try a simpler, more specific question
   - Check your internet connection
   - Verify your OpenAI API key is valid

3. **"No results found"**
   - Try rephrasing your question
   - Use more general terms (e.g., "downtown" instead of specific addresses)
   - Check if the data source is currently available

4. **Rate limiting**
   - The system uses GPT-4o-mini to minimize costs
   - If you hit rate limits, wait a moment and try again

### Performance Tips

- **Be specific**: "Speed cameras on King Street" vs "cameras"
- **Use Toronto landmarks**: "CN Tower", "downtown", "Harbourfront"
- **Mention data types**: "TTC", "bike share", "beaches"
- **Ask follow-up questions**: Use the suggested queries for related information

## Cost Considerations

- Uses GPT-4o-mini for cost-effective queries (~$0.15 per 1M input tokens)
- Typical query costs less than $0.01
- Caching reduces repeated API calls
- No charges for viewing cached results

## Development

### Extending the AI System

The AI query system is modular and can be extended:

1. **Add new data sources** in `src/core/ai/query-service.ts`
2. **Modify intent classification** by updating the schema
3. **Add custom filters** in the filtering functions
4. **Enhance summaries** by modifying the prompt templates

### Testing

```bash
# Test the AI query system
npm run test

# Test specific components
npm run test -- --grep "AI"
```

## Security Notes

- API keys are only used client-side for development
- For production, implement server-side API calls
- Consider implementing usage limits and monitoring
- Never expose API keys in client-side code for production

## Support

For issues or questions:
1. Check the console for error messages
2. Verify your environment configuration
3. Test with simple queries first
4. Check the GitHub issues for known problems 