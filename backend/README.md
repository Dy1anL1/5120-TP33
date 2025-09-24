# Silver Spoon Society - Backend API

A serverless backend system providing comprehensive nutrition and recipe APIs for elderly users aged 55-65, built with AWS Lambda and DynamoDB.

## Architecture Overview

The backend consists of three main serverless functions deployed as AWS Lambda functions:

- **recipes-api** - Recipe search, filtering, and meal planning
- **nutrition-match-api** - Nutritional analysis and ingredient matching
- **foods-api** - Food database and nutritional information

## Project Structure

```
backend/
├── functions/
│   ├── recipes-api/        # Recipe management and search
│   ├── nutrition-match-api/ # Nutrition calculation service
│   └── foods-api/          # Food database service
├── scripts/                # Deployment and utility scripts
├── package.json           # Root workspace configuration
└── README.md              # This file
```

## API Endpoints

### Recipes API
**Base URL**: `https://api.silverspoon.com/recipes`

- `GET /recipes?recipe_id={id}` - Get single recipe
- `GET /recipes?title_prefix={query}` - Search by title
- `GET /recipes?category={category}` - Filter by meal type
- `GET /recipes?diet_type={diet}` - Filter by dietary preferences
- `GET /recipes?allergy_filter={allergy}` - Filter by allergies

### Nutrition API
**Base URL**: `https://api.silverspoon.com/nutrition`

- `POST /nutrition` - Calculate nutrition from ingredients
- `GET /nutrition/match?ingredient={name}` - Match ingredient data

### Foods API
**Base URL**: `https://api.silverspoon.com/foods`

- `GET /foods?search={query}` - Search food database
- `GET /foods/{id}` - Get specific food item

## Database Design

### DynamoDB Tables

- **Recipes** - Recipe data with ingredients, instructions, and metadata
- **Foods** - Nutritional information for individual food items
- **Nutrition** - Calculated nutritional values and ingredient mappings

## Key Features

- **Senior-Friendly Filtering** - Tailored for users aged 55-65
- **Dietary Restrictions** - Supports vegetarian, vegan, gluten-free, etc.
- **Allergy Management** - Comprehensive allergy filtering system
- **Performance Optimized** - DynamoDB scan operations with intelligent caching
- **Error Handling** - Robust error responses with user-friendly messages

## Local Development

### Prerequisites
- Node.js 18+
- AWS CLI configured
- DynamoDB Local (optional)

### Setup
```bash
# Install dependencies
npm install

# Install function dependencies
cd functions/recipes-api && npm install
cd ../nutrition-match-api && npm install
cd ../foods-api && npm install
```

### Deployment

Each function can be deployed independently:

```bash
# Deploy recipes API
cd functions/recipes-api
npm run deploy

# Deploy nutrition API
cd functions/nutrition-match-api
npm run deploy

# Deploy foods API
cd functions/foods-api
npm run deploy
```

## Performance Considerations

- Uses DynamoDB scan operations with pagination
- Implements client-side filtering for complex queries
- Includes request timeout handling (8-second limit)
- Prioritizes nutrition data quality in results

## Environment Variables

- `RECIPES_TABLE_NAME` - DynamoDB recipes table
- `FOODS_TABLE_NAME` - DynamoDB foods table
- `AWS_REGION` - AWS deployment region

## Error Handling

All APIs return consistent error formats:
```json
{
  "error": "Error description",
  "statusCode": 400,
  "details": "Additional context"
}
```

## Contributing

1. Follow the modular architecture pattern
2. Add comprehensive error handling
3. Include JSDoc comments for functions
4. Update README for new endpoints
5. Test with elderly user scenarios

## License

Private - Silver Spoon Society Project