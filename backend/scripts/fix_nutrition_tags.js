import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import fetch from "node-fetch";

const REGION = "ap-southeast-2";
const TABLE = "Recipes_i2";
const NUTRITION_API = "https://0brixnxwq3.execute-api.ap-southeast-2.amazonaws.com/prod/match";

const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

// Nutrition thresholds for diet tags
const NUTRITION_THRESHOLDS = {
  low_sodium: { sodium_mg: 600 }, // Less than 600mg sodium per serving
  diabetic_friendly: { 
    carbs_g: 30,     // Less than 30g carbs per serving
    sugar_g: 10,     // Less than 10g sugar per serving
    sodium_mg: 800   // Also low sodium for diabetics
  },
  heart_healthy: {
    sodium_mg: 600,  // Low sodium
    saturated_fat_g: 5 // Low saturated fat
  },
  low_sugar: { sugar_g: 5 }, // Less than 5g sugar per serving
};

// Enhanced nutrition adjustment (from load_kaggle_json.js)
function adjustNutritionValue(value, label) {
  if (value == null || isNaN(Number(value))) return 0;
  
  const num = Number(value);
  if (num <= 0) return 0;
  
  const lowerLabel = label.toLowerCase();
  
  // Sodium adjustment - more aggressive for very high values
  if (lowerLabel.includes('sodium')) {
    if (num > 10000) return Math.round(num / 1000 * 200); // Very high values
    if (num > 5000) return Math.round(num / 1000 * 400);  // High values
    if (num > 2000) return Math.round(num * 0.6);         // Moderate values
    return num;
  }
  
  // Potassium adjustment
  if (lowerLabel.includes('potassium')) {
    if (num > 8000) return Math.round(num / 1000 * 300);
    return num;
  }
  
  // Calcium adjustment
  if (lowerLabel.includes('calcium')) {
    if (num > 3000) return Math.round(num / 1000 * 200);
    return num;
  }
  
  // Sugar adjustment
  if (lowerLabel.includes('sugar')) {
    if (num > 100) return Math.round(num * 0.3); // Very high sugar values
    return num;
  }
  
  // Carbs adjustment
  if (lowerLabel.includes('carb')) {
    if (num > 200) return Math.round(num * 0.4); // Very high carb values
    return num;
  }
  
  return num;
}

async function fetchNutrition(ingredients) {
  try {
    const normalized = (ingredients || []).map(s => ({ 
      text: typeof s === 'string' ? s : (s.text || s.name || ''),
      label: 'fresh'
    }));
    
    const res = await fetch(NUTRITION_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients: normalized })
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    
    if (!data.summary_100g_sum) return null;
    
    // Extract and adjust nutrition values
    const sum = data.summary_100g_sum;
    const nutrition = {
      calories: adjustNutritionValue(sum.calories || sum.energy_kcal || sum.energy, 'calories'),
      sodium_mg: adjustNutritionValue(sum.sodium_mg || sum.sodium, 'sodium'),
      sugar_g: adjustNutritionValue(sum.sugar_g || sum.sugars || sum.sugar, 'sugar'),
      carbs_g: adjustNutritionValue(sum.carbohydrate_g || sum.carbohydrate || sum.carbs, 'carbohydrate'),
      saturated_fat_g: adjustNutritionValue(sum.saturated_fat_g || sum.saturated_fat, 'saturated fat'),
      protein_g: adjustNutritionValue(sum.protein_g || sum.protein, 'protein')
    };
    
    return nutrition;
  } catch (error) {
    console.error('Nutrition fetch error:', error.message);
    return null;
  }
}

function checkNutritionTags(nutrition) {
  const tags = [];
  
  if (!nutrition) return tags;
  
  // Low sodium check
  if (nutrition.sodium_mg <= NUTRITION_THRESHOLDS.low_sodium.sodium_mg) {
    tags.push('low_sodium');
  }
  
  // Diabetic friendly check (multiple criteria)
  const diabeticCriteria = NUTRITION_THRESHOLDS.diabetic_friendly;
  if (nutrition.carbs_g <= diabeticCriteria.carbs_g && 
      nutrition.sugar_g <= diabeticCriteria.sugar_g && 
      nutrition.sodium_mg <= diabeticCriteria.sodium_mg) {
    tags.push('diabetic_friendly');
  }
  
  // Heart healthy check
  const heartCriteria = NUTRITION_THRESHOLDS.heart_healthy;
  if (nutrition.sodium_mg <= heartCriteria.sodium_mg && 
      nutrition.saturated_fat_g <= heartCriteria.saturated_fat_g) {
    tags.push('heart_healthy');
  }
  
  // Low sugar check
  if (nutrition.sugar_g <= NUTRITION_THRESHOLDS.low_sugar.sugar_g) {
    tags.push('low_sugar');
  }
  
  return tags;
}

async function scanAllRecipes() {
  console.log("🔍 Scanning all recipes in DynamoDB...");
  
  let items = [];
  let lastEvaluatedKey = undefined;
  let scanCount = 0;
  
  do {
    const params = {
      TableName: TABLE,
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
    };
    
    try {
      const result = await ddb.send(new ScanCommand(params));
      items.push(...result.Items);
      lastEvaluatedKey = result.LastEvaluatedKey;
      scanCount++;
      
      console.log(`   Scanned batch ${scanCount}, found ${result.Items.length} recipes (total: ${items.length})`);
    } catch (error) {
      console.error("Error scanning:", error);
      break;
    }
  } while (lastEvaluatedKey);
  
  console.log(`✅ Total recipes found: ${items.length}`);
  return items;
}

async function updateRecipe(recipeId, newHabits, newHabitsCSV) {
  const params = {
    TableName: TABLE,
    Key: { recipe_id: recipeId },
    UpdateExpression: "SET habits = :habits, habits_csv = :habits_csv",
    ExpressionAttributeValues: {
      ":habits": newHabits,
      ":habits_csv": newHabitsCSV
    }
  };
  
  try {
    await ddb.send(new UpdateCommand(params));
    return true;
  } catch (error) {
    console.error(`Failed to update recipe ${recipeId}:`, error);
    return false;
  }
}

async function main() {
  console.log("🥗 Adding Nutrition-Based Diet Tags");
  console.log("===================================\\n");
  
  // Scan all existing recipes
  const recipes = await scanAllRecipes();
  
  if (recipes.length === 0) {
    console.log("❌ No recipes found in database");
    return;
  }
  
  console.log("\\n🔍 Analyzing recipes with nutrition API (this may take a while)...");
  
  const updates = [];
  const newTagCounts = {};
  const batchSize = 5; // Small batch size to avoid API rate limits
  
  for (let i = 0; i < recipes.length; i += batchSize) {
    const batch = recipes.slice(i, i + batchSize);
    console.log(`   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(recipes.length / batchSize)} (recipes ${i + 1}-${Math.min(i + batchSize, recipes.length)})`);
    
    const nutritionPromises = batch.map(async (recipe) => {
      const nutrition = await fetchNutrition(recipe.ingredients || []);
      
      if (nutrition) {
        const nutritionTags = checkNutritionTags(nutrition);
        const currentHabits = new Set(recipe.habits || []);
        const newHabits = [...currentHabits];
        
        nutritionTags.forEach(tag => {
          if (!currentHabits.has(tag)) {
            newHabits.push(tag);
            newTagCounts[tag] = (newTagCounts[tag] || 0) + 1;
          }
        });
        
        if (newHabits.length > currentHabits.size) {
          return {
            recipe_id: recipe.recipe_id,
            title: recipe.title,
            oldHabits: [...currentHabits],
            newHabits: newHabits.sort(),
            addedTags: newHabits.filter(h => !currentHabits.has(h)),
            nutrition: nutrition
          };
        }
      }
      
      return null;
    });
    
    const batchResults = await Promise.all(nutritionPromises);
    updates.push(...batchResults.filter(r => r !== null));
    
    // Add delay to avoid API rate limiting
    if (i + batchSize < recipes.length) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds delay
    }
  }
  
  console.log(`\\n📈 Found ${updates.length} recipes that need nutrition-based diet tags`);
  
  if (updates.length === 0) {
    console.log("✅ No recipes qualify for nutrition-based diet tags");
    return;
  }
  
  // Show what new tags will be added
  console.log("\\n🏷️  New nutrition-based tags to be added:");
  Object.entries(newTagCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => {
      console.log(`  ${tag}: +${count} recipes`);
    });
  
  // Show first 10 examples with nutrition data
  console.log("\\n📋 First 10 recipes to update:");
  updates.slice(0, 10).forEach((update, i) => {
    console.log(`${i+1}. ${update.title}`);
    console.log(`   Adding: ${update.addedTags.join(', ')}`);
    console.log(`   Nutrition: ${update.nutrition.sodium_mg}mg sodium, ${update.nutrition.sugar_g}g sugar, ${update.nutrition.carbs_g}g carbs`);
    console.log('');
  });
  
  // Perform updates
  console.log(`\\n🚀 Updating ${updates.length} recipes...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    const success = await updateRecipe(
      update.recipe_id, 
      update.newHabits, 
      update.newHabits.join(',')
    );
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    if ((i + 1) % 20 === 0) {
      console.log(`   Updated ${i + 1}/${updates.length} recipes`);
    }
  }
  
  console.log("\\n🎉 UPDATE COMPLETE!");
  console.log("====================");
  console.log(`✅ Successfully updated: ${successCount} recipes`);
  console.log(`❌ Failed updates: ${failCount} recipes`);
  
  console.log("\\n📊 Final nutrition-based tag additions:");
  Object.entries(newTagCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => {
      console.log(`  ${tag}: +${count} recipes`);
    });
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});