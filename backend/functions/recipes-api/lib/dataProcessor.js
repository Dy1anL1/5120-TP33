// Data processing and normalization for recipes

/**
 * Normalize DynamoDB item to JavaScript object
 */
function normalizeRecipe(item) {
  if (!item || typeof item !== 'object') {
    console.warn('normalizeRecipe: received null or invalid item');
    return null;
  }

  try {
    // Convert DynamoDB format to JavaScript objects
    if (item.ingredients && item.ingredients.L) {
      item.ingredients = item.ingredients.L.map(i => i.S);
    }
    if (item.habits && item.habits.L) {
      item.habits = item.habits.L.map(h => h.S);
    }
    if (item.categories && item.categories.L) {
      item.categories = item.categories.L.map(c => c.S);
    }

    // Handle instructions - both DynamoDB Map and plain object formats
    if (item.instructions && item.instructions.M) {
      // Convert {"M": {"1": {"S": "step1"}, "2": {"S": "step2"}}} to ["step1", "step2"]
      const instructionObj = item.instructions.M;
      item.instructions = Object.keys(instructionObj)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(key => instructionObj[key].S);
      item.directions = item.instructions; // For compatibility
    } else if (item.instructions && typeof item.instructions === 'object' && !Array.isArray(item.instructions)) {
      // Handle case where instructions is already a plain object {"1": "step1", "2": "step2"}
      item.instructions = Object.keys(item.instructions)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(key => item.instructions[key]);
      item.directions = item.instructions;
    }

    // Handle string fields
    ['title', 'description', 'recipe_id', 'image_name', 'image_display', 'source', 'categories_csv', 'habits_csv', 'created_at'].forEach(key => {
      if (item[key] && item[key].S) item[key] = item[key].S;
    });

    // Handle number fields
    ['servings', 'rating', 'rating_count', 'cooking_time'].forEach(key => {
      if (item[key] && item[key].N) item[key] = Number(item[key].N);
      else if (item[key] && item[key].NULL) item[key] = null;
    });

    // Handle boolean fields
    if (item.has_image && typeof item.has_image.BOOL !== 'undefined') {
      item.has_image = item.has_image.BOOL;
    }

    // Handle nutrition object
    if (item.nutrition && item.nutrition.M) {
      const nutrition = {};
      Object.keys(item.nutrition.M).forEach(key => {
        nutrition[key] = Number(item.nutrition.M[key].N);
      });
      item.nutrition = nutrition;
    }

    // Handle complex objects (allergen_analysis)
    if (item.allergen_analysis && item.allergen_analysis.M) {
      const allergenAnalysis = {};
      Object.keys(item.allergen_analysis.M).forEach(allergen => {
        const allergenData = item.allergen_analysis.M[allergen].M;
        allergenAnalysis[allergen] = {
          score: Number(allergenData.score.N),
          riskLevel: allergenData.riskLevel.S,
          present: allergenData.present.BOOL,
          sources: allergenData.sources.L.map(s => s.S)
        };
      });
      item.allergen_analysis = allergenAnalysis;
    }

    // Ensure directions is properly formatted
    if (item.directions && Array.isArray(item.directions)) {
      item.directions = item.directions.map(dir => String(dir));
    }

    // Use stored tags if available, otherwise generate them
    if (!item.habits || !item.categories) {
      const tagGenerator = require('./tagGenerator');

      // Parse stored tags from CSV strings if they exist
      if (item.habits_csv) {
        item.habits = item.habits_csv.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        item.habits = tagGenerator.getHabits(item);
      }

      if (item.categories_csv) {
        item.categories = item.categories_csv.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        item.categories = tagGenerator.getCategories(item);
      }
    }

    // Add image-related fields - only if not already set
    if (!item.has_image && !item.image_display) {
      if (item.image_name || item.image_url || item.image_filename) {
        item.has_image = true;
        // Handle both old format (image_name) and new format (image_filename)
        const imageName = item.image_filename || item.image_name;
        item.image_display = item.image_url || (imageName ? `https://tp33-data-recipe.s3.ap-southeast-2.amazonaws.com/raw/foodspics/${imageName}.jpg` : null);
      } else {
        item.has_image = false;
        item.image_display = null;
      }
    } else if (item.image_display && !item.image_display.includes('.jpg') && !item.image_display.includes('.jpeg')) {
      // Fix missing .jpg extension in existing URLs
      item.image_display = item.image_display + '.jpg';
    }

    return item;
  } catch (error) {
    console.error(`Error normalizing recipe ${item?.recipe_id}:`, error.message);
    console.error('Stack trace:', error.stack);
    console.error('Item data:', JSON.stringify(item, null, 2));
    return null;
  }
}

/**
 * Process array of items and normalize them
 */
function normalizeRecipes(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map(normalizeRecipe)
    .filter(item => item !== null);
}

module.exports = {
  normalizeRecipe,
  normalizeRecipes
};