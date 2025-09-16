# Recipes API - Modular Architecture

This Lambda function provides a RESTful API for recipe data with comprehensive search, filtering, and browsing capabilities designed for elderly users with specific dietary needs.

## Project Structure

```
recipes-api/
├── index.js              # Main Lambda handler (entry point)
├── config/
│   └── constants.js      # Configuration constants and dietary mappings
├── lib/
│   ├── dataProcessor.js  # DynamoDB data normalization
│   ├── filterLogic.js    # Recipe filtering logic
│   ├── queryHandlers.js  # Query-specific handlers
│   ├── tagGenerator.js   # Dietary tag generation
│   └── utils.js          # Common utilities
├── deploy.ps1           # PowerShell deployment script
├── package.json         # Dependencies
└── README.md           # This file
```

## API Endpoints

### Base URL
`https://your-api-gateway-url/recipes`

### Supported Operations

1. **Single Recipe Lookup**
   ```
   GET /recipes?recipe_id=12345
   ```

2. **Title Search**
   ```
   GET /recipes?title_prefix=chicken&limit=10
   ```

3. **Category Filtering**
   ```
   GET /recipes?category=breakfast&limit=20
   ```

4. **Dietary Filtering**
   ```
   GET /recipes?diet_type=vegetarian&allergy_filter=gluten_free&limit=15
   ```

5. **Habit Filtering**
   ```
   GET /recipes?habit=soft_food&limit=10
   ```

6. **General Browsing**
   ```
   GET /recipes?limit=20&next_token=eyJ...
   ```

7. **Available Filters (Facets)**
   ```
   GET /recipes?facets=true
   ```

## Query Parameters

| Parameter | Type | Description | Valid Values |
|-----------|------|-------------|--------------|
| `recipe_id` | string | Get specific recipe by ID | Any valid recipe ID |
| `title_prefix` | string | Search recipes by title prefix | Any text |
| `category` | string | Filter by recipe category | `breakfast`, `lunch`, `dinner`, `dessert`, `soup`, `salad`, `snack`, `drink` |
| `diet_type` | string | Filter by diet type | `vegetarian`, `vegan`, `low_sugar`, `low_sodium`, `heart_healthy`, `diabetic_friendly` |
| `allergy_filter` | string | Filter by allergy restrictions | `dairy_free`, `gluten_free`, `nut_free`, `seafood_free`, `soy_free`, `fish_free`, `shellfish_free`, `egg_free` |
| `habit` | string | Filter by eating habits | `soft_food`, `easy_chew`, `finger_food`, etc. |
| `limit` | number | Number of results to return | 1-100 (default: 20) |
| `next_token` | string | Pagination token for next page | Base64 encoded token |
| `facets` | boolean | Return available filter options | `true` |

## Response Format

### Single Recipe Response
```json
{
  "recipe_id": "12345",
  "title": "Soft Chicken Soup",
  "ingredients": ["chicken breast", "carrots", "celery"],
  "instructions": ["Step 1...", "Step 2..."],
  "nutrition": {
    "calories": 250,
    "protein": "25g",
    "sodium": "400mg"
  },
  "categories": ["soup", "lunch"],
  "habits": ["soft_food", "heart_healthy", "low_sodium"]
}
```

### Multiple Recipes Response
```json
{
  "recipes": [...],
  "count": 15,
  "next_token": "eyJyZWNpcGVfaWQiOiIxMjM0NSJ9"
}
```

### Facets Response
```json
{
  "categories": ["breakfast", "lunch", "dinner", ...],
  "diet_types": ["vegetarian", "vegan", ...],
  "allergy_filters": ["dairy_free", "gluten_free", ...],
  "habits": ["soft_food", "easy_chew", ...]
}
```

## Module Descriptions

### Main Handler (`index.js`)
- Entry point for Lambda function
- Routes requests to appropriate handlers
- Handles CORS preflight requests
- Validates parameters

### Configuration (`config/constants.js`)
- API limits and defaults
- CORS headers configuration
- Dietary tag mappings
- Category keywords for tag generation

### Data Processor (`lib/dataProcessor.js`)
- Normalizes DynamoDB data format
- Converts List/Map format to JavaScript objects
- Processes instructions from object to array format
- Handles missing or malformed data

### Filter Logic (`lib/filterLogic.js`)
- Applies individual filters (category, diet, allergy, habit, title)
- Combines multiple filters
- Validates filter parameters
- Checks for filter presence

### Query Handlers (`lib/queryHandlers.js`)
- `handleSingleRecipe`: Get recipe by ID
- `handleTitleSearch`: Search by title with filtering
- `handleFilteredQuery`: Apply multiple filters
- `handleGeneralScan`: Browse recipes without filters
- `handleFacetsQuery`: Return available filter options

### Tag Generator (`lib/tagGenerator.js`)
- Analyzes recipe ingredients and instructions
- Generates dietary habit tags
- Categorizes recipes automatically
- Supports elderly-specific dietary needs (soft food, easy chew)

### Utilities (`lib/utils.js`)
- Response formatting
- Pagination token encoding/decoding
- Error handling
- Parameter validation

## Deployment

### Prerequisites
- PowerShell
- AWS CLI configured
- Node.js and npm

### Deploy to AWS Lambda
```powershell
# Package and deploy
./deploy.ps1 -deploy

# Package only (for testing)
./deploy.ps1
```

The deployment script:
1. Installs dependencies locally
2. Creates `.package` directory
3. Copies all source files and modules
4. Creates `function.zip`
5. Uploads to AWS Lambda (if `-deploy` flag used)

## Development

### Adding New Filters
1. Add validation rules in `lib/filterLogic.js`
2. Implement filter function
3. Update `applyAllFilters` function
4. Add to `hasAnyFilter` check

### Adding New Tags
1. Define keywords in `config/constants.js`
2. Implement detection logic in `lib/tagGenerator.js`
3. Update facets response in `lib/queryHandlers.js`

### Testing Locally
The modular structure allows for easier unit testing:
```javascript
const { handleSingleRecipe } = require('./lib/queryHandlers');
const mockEvent = { queryStringParameters: { recipe_id: '12345' } };
// Test individual handlers
```

## Error Handling

All modules use consistent error handling:
- Input validation with descriptive error messages
- Graceful handling of missing data
- Proper HTTP status codes
- CORS headers on all responses

## Performance Considerations

- Uses DynamoDB scan with limits to prevent timeouts
- Client-side filtering due to GSI limitations
- Cursor-based pagination for large result sets
- Efficient tag generation with keyword matching