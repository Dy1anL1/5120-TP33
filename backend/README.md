# Silver Spoon Society - Backend API

A serverless backend system providing comprehensive nutrition and recipe APIs for elderly users aged 55-65, built with AWS Lambda and DynamoDB.

## Architecture Overview

The backend consists of three main serverless functions deployed as AWS Lambda functions:

- **recipes-api** - Recipe search, filtering, and meal planning functionality
- **nutrition-match-api** - Advanced nutritional analysis with intelligent ingredient matching
- **foods-api** - Food database management and nutritional information lookup

## Project Structure

```
backend/
├── functions/
│   ├── recipes-api/        # Recipe management and search
│   ├── nutrition-match-api/ # Nutrition calculation service
│   └── foods-api/          # Food database service
├── scripts/                # Data management and utility scripts
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
- `GET /recipes?ingredients={ingredient1,ingredient2}` - Filter by seasonal ingredients (word-boundary matching)

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

#### Foods_v2 Table
**Primary Key**: `id` (String)
**Global Secondary Index**: `gsi_name_prefix`
- Partition Key: `name_lc_first1` (String) - First character of lowercase name
- Sort Key: `name_lc` (String) - Full lowercase name

**Data Structure**:
```javascript
{
  id: "fd_2dObzdqa6o2J",                    // Unique food identifier
  name: "Chicken Breast, Boneless Skinless", // Display name
  name_lc: "chicken breast, boneless skinless", // Lowercase for searching
  name_lc_first1: "c",                     // First character for prefix queries
  alternate_names: ["cooked chicken breast", ...], // Search variations
  description: "Lean protein source...",   // Detailed description
  type: "everyday",                        // Food category
  nutrition_100g: {                        // Nutrition per 100g
    calories: 151,
    protein: 30.54,
    total_fat: 3.17,
    sodium: 52,
    // ... other nutrients
  },
  serving: {                               // Recommended serving size
    common: { unit: "oz", quantity: 3 },
    metric: { unit: "g", quantity: 85 }
  }
}
```

#### Recipes Table
- Recipe data with ingredients, instructions, and metadata
- Supports filtering by dietary preferences and allergies
- Includes nutritional analysis integration

## Key Features

### Nutrition Matching System
- **Intelligent Ingredient Parsing** - Extracts amounts, units, and ingredient names
- **Fuzzy Matching** - Multiple search strategies with scoring algorithm
- **Data Source** - OpenNutrition database with 10,000+ food items
- **Unit Conversion** - Supports cups, tablespoons, grams, ounces, etc.
- **Simplified Nutrition Focus** - 12 core nutrients optimized for senior health (55-65+)

### Search & Filtering
- **Senior-Friendly Design** - Optimized for users aged 55-65
- **Seasonal Ingredient Filtering** - Word-boundary regex matching prevents false positives (e.g., "apple" won't match "applewood")
- **Dietary Restrictions** - Vegetarian, vegan, keto, low-sodium, etc.
- **Allergy Management** - Comprehensive allergen filtering
- **Performance Optimized** - DynamoDB GSI queries with efficient indexing
- **Error Handling** - Robust error responses with detailed debugging

## Data Management

### CSV Upload Script
Upload OpenNutrition foods data to DynamoDB:

```bash
cd scripts/
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
node upload-foods.js
```

**Features**:
- Processes CSV with JSON fields (nutrition_100g, serving, etc.)
- Handles batch uploads (25 items per batch)
- Creates proper GSI keys (`name_lc`, `name_lc_first1`)
- Comprehensive error handling and progress reporting

### Table Structure Verification
```bash
node check-table.js  # Verify DynamoDB table structure
```

## Local Development

### Prerequisites
- Node.js 18+
- AWS CLI configured with ap-southeast-2 region
- Access to Foods_v2 DynamoDB table

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

- `AWS_REGION` - AWS deployment region (default: ap-southeast-2)
- `FOODS_TABLE` - Foods database table name (default: Foods_v2)
- `FOODS_GSI` - Foods table GSI name (default: gsi_name_prefix)
- `RECIPES_TABLE_NAME` - DynamoDB recipes table

## Nutrition API Details

### Request Format
```javascript
POST /nutrition
{
  "ingredients": [
    "2 cups cooked rice",
    "6 oz chicken breast",
    "1 tbsp olive oil"
  ]
}
```

### Response Format
```javascript
{
  "results": [
    {
      "ingredient": "2 cups cooked rice",
      "query": "cooked rice",
      "match": {
        "id": "fd_gbtVB7G9twmc",
        "name": "Rice, Cooked",
        "nutrition_100g": { "calories": 130, "protein": 2.69, ... },
        "gram_used": 480
      },
      "search_attempts": [...],
      "successful_query": "rice"
    }
  ],
  "summary_100g_sum": {
    "calories": 892.4,
    "protein": 58.2,
    "total_fat": 15.7,
    "carbohydrates": 127.3,
    "dietary_fiber": 8.5,
    "total_sugars": 12.1,
    "saturated_fats": 4.2,
    "trans_fats": 0.1,
    "vitamin_d": 145.6,
    "calcium": 289.3,
    "iron": 7.8,
    "potassium": 1245.7
  }
}

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