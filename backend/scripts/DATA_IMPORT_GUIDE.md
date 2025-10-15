# Data Import Guide

Once all data files have been prepared, import them into the database using the guide below, which outlines the required table mappings and upload steps.

## Prerequisites

- Node.js 18+
- AWS CLI configured (region: `ap-southeast-2`)
- DynamoDB tables created: `Foods_v2`, `Recipes_i2`

## Table Mappings

| Data File | DynamoDB Table | Primary Key | Upload Script |
|-----------|----------------|-------------|---------------|
| `opennutrition_foods.csv` | `Foods_v2` | `id` | `upload-foods.js` |
| `recipes_processed.json` | `Recipes_i2` | `recipe_id` | `load_json.js` |

### Foods_v2 Schema

```javascript
{
  id: "fd_abc123",              // Primary key
  name: "Chicken Breast",       // Food name
  name_lc: "chicken breast",    // Lowercase for search
  name_lc_first1: "c",          // First char for GSI
  nutrition_100g: {             // Per 100g nutrition
    calories: 151,
    protein: 30.54,
    // ... other nutrients
  },
  serving: { unit: "oz", quantity: 3 }
}
```

**GSI**: `gsi_name_prefix` (partition: `name_lc_first1`, sort: `name_lc`)

### Recipes_i2 Schema

```javascript
{
  recipe_id: "json_0001",       // Primary key
  title: "Grilled Chicken",     // Recipe title
  ingredients: [...],           // Ingredient list
  instructions: [...],          // Step-by-step instructions
  categories: ["lunch", "dinner"],  // Meal types
  habits: ["gluten_free"],      // Dietary tags
  servings: 4,
  has_image: true,
  image_display: "https://..."  // S3 image URL
}
```

**GSI**: `gsi_title_prefix` (partition: `title_lc_first1`, sort: `title_lc`)

## Upload Steps

### 1. Install Dependencies

```bash
cd backend/scripts
npm install
```

### 2. Upload Foods Data

```bash
node upload-foods.js
```

- Reads `opennutrition_foods.csv` from `scripts/` directory
- Uploads ~10,000 food items in batches of 25
- Duration: ~5-10 minutes

### 3. Upload Recipes Data

```bash
node load_json.js
```

- Reads `recipes_processed.json` from `scripts/` directory
- Converts boolean fields to tags (vegetarian, vegan, etc.)
- Uploads ~1,000 recipes in batches of 25
- Duration: ~3-5 minutes
- Creates log file: `load_json_output.log`

## Verification

```bash
# Check item counts
aws dynamodb scan --table-name Foods_v2 --select COUNT --region ap-southeast-2
aws dynamodb scan --table-name Recipes_i2 --select COUNT --region ap-southeast-2

# Verify table structure
node check-nutrition-table.js
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CSV file not found | Place `opennutrition_foods.csv` in `scripts/` directory |
| Table not found | Create tables in DynamoDB with correct names and schemas |
| Permission denied | Ensure IAM credentials have DynamoDB write permissions |
| Batch write failures | Script auto-retries; check AWS throttling limits |

## Summary

✅ **Expected Results**:
- `Foods_v2`: ~10,000 food items with nutrition data
- `Recipes_i2`: ~1,000 recipes with categories and dietary tags
- All items indexed for fast searching via GSI

For detailed API documentation, see [backend/README.md](README.md).
