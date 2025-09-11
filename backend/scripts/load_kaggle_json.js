import fs from "fs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";

const REGION = "ap-southeast-2";
const TABLE = "Recipes_i2";
const TARGET_RECIPES = 1000;

// Ingredient quota targets
const INGREDIENT_QUOTAS = {
  meat: { total: 250, chicken: 100, pork: 80, beef: 50, lamb: 20 },
  seafood: { total: 150, fish: 100, shellfish: 30, other: 20 },
  vegetable: { total: 300, leafy: 80, root: 80, gourd: 60, mushroom: 40, other: 40 },
  staple: { total: 200, rice: 80, pasta: 60, beans: 40, other: 20 },
  dairy_egg: { total: 100, egg: 60, dairy: 40 }
};

const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

// Nutrition API configuration
const NUTRITION_API = "https://0brixnxwq3.execute-api.ap-southeast-2.amazonaws.com/prod/match";

// --- Utility Functions ---
const W = (s) => (s || '').toLowerCase().trim();
const hasWord = (hay, w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(hay);
const anyWord = (hay, words) => words.some(w => hasWord(hay, w));
const notAnyWord = (hay, words) => !anyWord(hay, words);

// --- Nutrition Validation Functions ---
async function fetchNutrition(ingredients) {
  try {
    const normalized = (ingredients || []).map(s => ({ 
      text: typeof s === 'string' ? s : (s.text || s.name || ''),
      label: inferLabelFromText(typeof s === 'string' ? s : (s.text || s.name || ''))
    }));
    
    const res = await fetch(NUTRITION_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients: normalized })
    });
    
    if (!res.ok) throw new Error(`Nutrition API error: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Nutrition fetch error:', error.message);
    return null;
  }
}

function inferLabelFromText(text) {
  if (!text) return null;
  const s = String(text).toLowerCase();
  if (/\b(canned|tin|in brine|in oil|drained)\b/.test(s)) return 'canned';
  if (/\b(frozen|flash frozen)\b/.test(s)) return 'frozen';
  if (/\b(fresh|raw)\b/.test(s)) return 'fresh';
  if (/\b(cooked|boiled|steamed)\b/.test(s)) return 'cooked';
  return 'fresh';
}

function getAny(obj, keys) {
  if (!obj) return null;
  for (const key of keys) {
    if (obj[key] != null && !isNaN(Number(obj[key]))) {
      return Number(obj[key]);
    }
  }
  return null;
}

async function validateNutrition(ingredients) {
  if (!ingredients || ingredients.length === 0) return false;
  
  const nutritionData = await fetchNutrition(ingredients);
  if (!nutritionData || !nutritionData.summary_100g_sum) return false;
  
  const sum = nutritionData.summary_100g_sum;
  
  // Check for basic nutrition information
  const calories = getAny(sum, ['calories', 'energy_kcal', 'energy']);
  const protein = getAny(sum, ['protein', 'protein_g']);
  const carbs = getAny(sum, ['carbohydrate', 'carbs', 'carbohydrate_g']);
  
  // Must have calorie information
  if (calories === null || calories <= 0) return false;
  
  return true;
}

// --- Precise Ingredient Classification System ---
function classifyByIngredients(title, ingredients, tags) {
  const text = `${W(title)} ${ingredients.join(' ').toLowerCase()}`;
  const tagText = JSON.stringify(tags).toLowerCase();
  const allText = `${text} ${tagText}`;
  
  // Meat classification
  const meatClassification = {
    chicken: ['chicken', 'poultry', 'hen', 'rooster'],
    pork: ['pork', 'bacon', 'ham', 'sausage', 'chorizo', 'prosciutto'],
    beef: ['beef', 'steak', 'ground beef', 'chuck', 'sirloin', 'brisket'],
    lamb: ['lamb', 'mutton', 'goat']
  };
  
  // Seafood classification
  const seafoodClassification = {
    fish: ['salmon', 'tuna', 'cod', 'bass', 'tilapia', 'snapper', 'halibut', 'trout', 'mackerel'],
    shellfish: ['shrimp', 'crab', 'lobster', 'scallop', 'oyster', 'clam', 'mussel'],
    other: ['squid', 'octopus', 'calamari', 'anchovy', 'sardine']
  };
  
  // Vegetable classification
  const vegetableClassification = {
    leafy: ['spinach', 'lettuce', 'kale', 'arugula', 'chard', 'cabbage', 'bok choy'],
    root: ['carrot', 'potato', 'onion', 'garlic', 'ginger', 'beet', 'turnip', 'radish'],
    gourd: ['zucchini', 'squash', 'pumpkin', 'cucumber', 'eggplant', 'tomato'],
    mushroom: ['mushroom', 'shiitake', 'portobello', 'cremini', 'chanterelle'],
    other: ['broccoli', 'cauliflower', 'pepper', 'corn', 'peas', 'beans', 'asparagus']
  };
  
  // Staple classification
  const stapleClassification = {
    rice: ['rice', 'risotto', 'paella', 'pilaf'],
    pasta: ['pasta', 'spaghetti', 'linguine', 'penne', 'ravioli', 'lasagna', 'noodle'],
    beans: ['lentil', 'chickpea', 'black bean', 'kidney bean', 'quinoa'],
    other: ['bread', 'flour', 'oat', 'barley', 'couscous']
  };
  
  // Dairy and egg classification
  const dairyEggClassification = {
    egg: ['egg', 'eggs', 'omelet', 'frittata', 'quiche'],
    dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream']
  };
  
  const result = { type: 'other', subtype: 'other', priority: 0 };
  
  // Check each classification
  for (const [mainType, subTypes] of Object.entries({
    meat: meatClassification,
    seafood: seafoodClassification,
    vegetable: vegetableClassification,
    staple: stapleClassification,
    dairy_egg: dairyEggClassification
  })) {
    for (const [subType, keywords] of Object.entries(subTypes)) {
      if (anyWord(allText, keywords)) {
        result.type = mainType;
        result.subtype = subType;
        result.priority = keywords.some(k => hasWord(text, k)) ? 2 : 1; // title/ingredients have higher priority
        return result;
      }
    }
  }
  
  return result;
}

// --- Senior Friendly Scoring ---
function getSeniorFriendlyScore(title, ingredients, instructions, cookingTime) {
  let score = 50;
  const text = `${title} ${ingredients.join(' ')} ${Object.values(instructions).join(' ')}`.toLowerCase();
  
  // Cooking method scoring
  const excellentMethods = ['steamed', 'boiled', 'stewed', 'braised', 'slow cook', 'simmer', 'poach'];
  const goodMethods = ['baked', 'roasted', 'grilled', 'sautéed', 'mashed'];
  const badMethods = ['deep-fried', 'fried', 'very spicy'];
  
  excellentMethods.forEach(method => {
    if (hasWord(text, method)) score += 5;
  });
  goodMethods.forEach(method => {
    if (hasWord(text, method)) score += 2;
  });
  badMethods.forEach(method => {
    if (hasWord(text, method)) score -= 4;
  });
  
  // Health keywords
  if (hasWord(text, 'healthy') || hasWord(text, 'nutritious')) score += 3;
  if (hasWord(text, 'low sodium') || hasWord(text, 'low salt')) score += 4;
  if (hasWord(text, 'soft') || hasWord(text, 'tender')) score += 4;
  if (hasWord(text, 'easy') || hasWord(text, 'simple')) score += 2;
  
  // Cooking time scoring
  if (cookingTime && cookingTime <= 30) score += 3;
  else if (cookingTime && cookingTime <= 60) score += 1;
  else if (cookingTime && cookingTime > 120) score -= 2;
  
  // Complexity penalty
  if (ingredients.length > 20) score -= 3;
  
  return Math.max(0, Math.min(100, score));
}

// --- Category Detection ---
function getCategory(title, tags) {
  const titleLower = W(title);
  const categories = new Set();
  
  // Priority judgment based on tags
  if (tags.meal) {
    tags.meal.forEach(meal => {
      const mealLower = meal.toLowerCase();
      if (mealLower.includes('breakfast')) categories.add('breakfast');
      if (mealLower.includes('lunch')) categories.add('lunch');
      if (mealLower.includes('dinner')) categories.add('dinner');
      if (mealLower.includes('side')) categories.add('snack');
    });
  }
  
  // Based on type tags
  if (tags.type) {
    tags.type.forEach(type => {
      const typeLower = type.toLowerCase();
      if (typeLower.includes('soup') || typeLower.includes('stew')) categories.add('soup');
      if (typeLower.includes('salad')) categories.add('salad');
      if (typeLower.includes('dessert') || typeLower.includes('cake') || typeLower.includes('cookie')) categories.add('dessert');
      if (typeLower.includes('drink') || typeLower.includes('smoothie')) categories.add('drink');
    });
  }
  
  // Traditional category logic based on title
  if (anyWord(titleLower, ['soup', 'broth', 'stew', 'chowder', 'bisque'])) {
    categories.add('soup');
  }
  if (anyWord(titleLower, ['salad', 'slaw'])) {
    categories.add('salad');
  }
  if (anyWord(titleLower, ['cake', 'pie', 'cookie', 'dessert', 'pudding', 'ice cream'])) {
    categories.add('dessert');
  }
  if (anyWord(titleLower, ['smoothie', 'juice', 'drink', 'cocktail', 'latte'])) {
    categories.add('drink');
  }
  // Breakfast recipe recognition - extended keywords
  if (anyWord(titleLower, [
    'breakfast', 'morning', 'pancake', 'pancakes', 'waffle', 'waffles', 'oatmeal', 
    'cereal', 'granola', 'muesli', 'porridge', 'toast', 'muffin', 'muffins', 
    'bagel', 'bagels', 'scone', 'scones', 'french toast', 'eggs benedict',
    'omelet', 'omelette', 'frittata', 'quiche', 'breakfast bowl', 'yogurt parfait',
    'smoothie bowl', 'chia pudding', 'overnight oats', 'breakfast burrito',
    'hash browns', 'bacon and eggs', 'pancake mix', 'brunch'
  ])) {
    categories.add('breakfast');
  }
  
  // Breakfast recognition based on tags
  if (tags.meal) {
    const mealTags = tags.meal.join(' ').toLowerCase();
    if (mealTags.includes('breakfast') || mealTags.includes('brunch')) {
      categories.add('breakfast');
    }
  }
  if (anyWord(titleLower, ['sandwich', 'wrap', 'burger', 'lunch'])) {
    categories.add('lunch');
  }
  
  // Main dishes default to lunch and dinner
  if (anyWord(titleLower, ['chicken', 'beef', 'pork', 'fish', 'pasta', 'rice'])) {
    categories.add('lunch');
    categories.add('dinner');
  }
  
  // If there is no category, default to dinner
  if (categories.size === 0) {
    categories.add('dinner');
  }
  
  return Array.from(categories);
}

// --- Diet Habits Detection ---
function getDietHabits(title, ingredients, tags) {
  const text = `${W(title)} ${ingredients.join(' ').toLowerCase()}`;
  const habits = [];
  
  // Special consideration based on tags
  if (tags['special-consideration']) {
    tags['special-consideration'].forEach(consideration => {
      const consLower = consideration.toLowerCase();
      if (consLower.includes('vegetarian')) habits.push('vegetarian');
      if (consLower.includes('vegan')) habits.push('vegan');
      if (consLower.includes('gluten free')) habits.push('gluten_free');
      if (consLower.includes('dairy free')) habits.push('dairy_free');
      if (consLower.includes('nut free')) habits.push('nut_free');
    });
  }
  
  // Meat detection
  const meat = ['beef', 'pork', 'bacon', 'ham', 'lamb', 'sausage'];
  const poultry = ['chicken', 'turkey', 'duck'];
  const seafood = ['fish', 'salmon', 'tuna', 'shrimp', 'crab'];
  
  const hasMeat = anyWord(text, meat);
  const hasPoultry = anyWord(text, poultry);
  const hasSeafood = anyWord(text, seafood);
  
  if (!hasMeat && !hasPoultry && !hasSeafood && !habits.includes('vegetarian')) {
    habits.push('vegetarian');
  }
  
  // Health tags
  if (hasWord(text, 'low sugar') || hasWord(text, 'sugar free')) habits.push('low_sugar');
  if (hasWord(text, 'low sodium') || hasWord(text, 'low salt')) habits.push('low_sodium');
  if (hasWord(text, 'heart healthy') || hasWord(text, 'low fat')) habits.push('heart_healthy');
  if (hasWord(text, 'diabetic') || hasWord(text, 'diabetes')) habits.push('diabetic_friendly');
  if (hasWord(text, 'soft') || hasWord(text, 'tender')) habits.push('soft_food');
  
  // Allergen detection (if not marked in tags)
  const allergens = {
    dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt'],
    gluten: ['wheat', 'flour', 'bread', 'pasta'],
    nuts: ['peanut', 'almond', 'walnut', 'cashew'],
    shellfish: ['shrimp', 'crab', 'lobster'],
    eggs: ['egg', 'eggs', 'mayonnaise'],
    soy: ['soy', 'tofu', 'miso'],
    fish: ['fish', 'salmon', 'tuna']
  };
  
  Object.entries(allergens).forEach(([allergen, keywords]) => {
    const tag = `${allergen}_free`;
    if (!habits.includes(tag) && notAnyWord(text, keywords)) {
      habits.push(tag);
    }
  });
  
  return habits;
}

// --- Quota Manager ---
class IngredientQuotaManager {
  constructor() {
    this.quotas = JSON.parse(JSON.stringify(INGREDIENT_QUOTAS)); // deep copy
    this.selected = [];
  }
  
  canAdd(classification) {
    const { type, subtype } = classification;
    if (!this.quotas[type]) return false;
    
    if (this.quotas[type][subtype] > 0) {
      return true;
    }
    return false;
  }
  
  addRecipe(recipe, classification) {
    const { type, subtype } = classification;
    if (this.canAdd(classification)) {
      this.quotas[type][subtype]--;
      this.quotas[type].total--;
      this.selected.push({ ...recipe, classification });
      return true;
    }
    return false;
  }
  
  getStats() {
    return this.quotas;
  }
  
  isComplete() {
    return this.selected.length >= TARGET_RECIPES;
  }
}

// --- Batch Write ---
async function batchWriteAll(items, table) {
  console.log(`🚀 Writing ${items.length} recipes to ${table}...`);
  
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    const params = {
      RequestItems: {
        [table]: batch.map((item) => ({ PutRequest: { Item: item } })),
      },
    };
    
    try {
      await ddb.send(new BatchWriteCommand(params));
      console.log(`✅ Batch ${Math.floor(i/25) + 1}/${Math.ceil(items.length/25)} (items ${i + 1}-${i + batch.length})`);
    } catch (err) {
      console.error(`❌ Batch ${Math.floor(i/25) + 1} failed:`, err);
    }
  }
}

// --- Main Function ---
async function main() {
  console.log("🍳 Loading Kaggle JSON Recipe Dataset to Recipes_i2");
  console.log(`📊 Target: ${TARGET_RECIPES} recipes with precise ingredient distribution\n`);
  
  console.log("📖 Reading JSON file...");
  const rawData = fs.readFileSync("recipes_images.json", 'utf8');
  const allRecipes = JSON.parse(rawData);
  
  console.log(`📊 Found ${allRecipes.length.toLocaleString()} total recipes`);
  
  // Filter recipes that have images
  const recipesWithImages = allRecipes.filter(recipe => 
    recipe.image_filename && recipe.image_filename !== null
  );
  
  
  console.log(`📸 Recipes with images: ${recipesWithImages.length.toLocaleString()}`);
  
  // Calculate classification and score for each recipe
  console.log("🔍 Analyzing and classifying recipes...");
  const analyzedRecipes = recipesWithImages.map((recipe, index) => {
    if (index % 5000 === 0) {
      console.log(`   Analyzed ${index.toLocaleString()} recipes...`);
    }
    
    const classification = classifyByIngredients(
      recipe.title, 
      recipe.ingredients || [], 
      recipe.tags || {}
    );
    
    const score = getSeniorFriendlyScore(
      recipe.title,
      recipe.ingredients || [],
      recipe.instructions || {},
      recipe.cooking_time
    );
    
    return {
      ...recipe,
      classification,
      seniorScore: score
    };
  });
  
  // Nutrition validation filter - only validate the top 3000 high scoring recipes (to ensure 1000 nutritious ones can be found)
  console.log("🥗 Validating nutrition data for top recipes (this may take a while)...");
  
  // Sort by score, only validate the top 3000 best recipes
  const sortedForValidation = [...analyzedRecipes].sort((a, b) => b.seniorScore - a.seniorScore).slice(0, 3000);
  console.log(`🎯 Validating top ${sortedForValidation.length} recipes to find 1000 with nutrition data`);
  
  const validatedRecipes = [];
  const batchSize = 10; // reduce concurrency to avoid 503 errors
  
  for (let i = 0; i < sortedForValidation.length && validatedRecipes.length < TARGET_RECIPES * 1.5; i += batchSize) {
    const batch = sortedForValidation.slice(i, i + batchSize);
    console.log(`   Validating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(Math.min(sortedForValidation.length, TARGET_RECIPES * 1.5) / batchSize)} (recipes ${i + 1}-${Math.min(i + batchSize, sortedForValidation.length)}) - Found: ${validatedRecipes.length}`);
    
    const validationPromises = batch.map(async (recipe) => {
      const isValid = await validateNutrition(recipe.ingredients || []);
      if (isValid) {
        return recipe;
      }
      return null;
    });
    
    const validationResults = await Promise.all(validationPromises);
    validatedRecipes.push(...validationResults.filter(r => r !== null));
    
    // If enough recipes have been found, exit early
    if (validatedRecipes.length >= TARGET_RECIPES * 1.5) {
      console.log(`✅ Found enough recipes (${validatedRecipes.length}), stopping validation early`);
      break;
    }
    
    // Add delay to avoid API rate limiting
    if (i + batchSize < sortedForValidation.length) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds delay
    }
  }
  
  console.log(`✅ Validated recipes: ${validatedRecipes.length} out of ${analyzedRecipes.length} (${((validatedRecipes.length / analyzedRecipes.length) * 100).toFixed(1)}%)`);
  
  if (validatedRecipes.length < TARGET_RECIPES) {
    console.log(`⚠️  Warning: Only ${validatedRecipes.length} recipes passed nutrition validation, less than target ${TARGET_RECIPES}`);
  }
  
  console.log("🎯 Selecting recipes with balanced ingredient distribution...");
  
  // Sort by classification and score, then distribute quotas
  const quotaManager = new IngredientQuotaManager();
  const typeGroups = {
    meat: [],
    seafood: [],
    vegetable: [],
    staple: [],
    dairy_egg: [],
    other: []
  };
  
  // Grouping - using validated recipes
  validatedRecipes.forEach(recipe => {
    const type = recipe.classification.type;
    if (typeGroups[type]) {
      typeGroups[type].push(recipe);
    } else {
      typeGroups.other.push(recipe);
    }
  });
  
  // Sort each group by score
  Object.keys(typeGroups).forEach(type => {
    typeGroups[type].sort((a, b) => b.seniorScore - a.seniorScore);
  });
  
  // Distribute recipes - multi-round strategy to ensure reaching 1000
  const maxAttempts = 100000;
  let attempts = 0;
  
  // First round: strictly allocate according to quotas
  while (!quotaManager.isComplete() && attempts < maxAttempts) {
    let added = false;
    
    for (const [type, recipes] of Object.entries(typeGroups)) {
      if (recipes.length > 0 && quotaManager.quotas[type]?.total > 0) {
        const recipe = recipes.shift();
        if (quotaManager.addRecipe(recipe, recipe.classification)) {
          added = true;
        }
      }
    }
    
    if (!added) break;
    attempts++;
  }
  
  // Second round: If still not reached 1000, select from remaining recipes by score
  if (quotaManager.selected.length < TARGET_RECIPES) {
    console.log(`🔄 First round selected ${quotaManager.selected.length}, adding more...`);
    
    const remainingRecipes = [];
    Object.values(typeGroups).forEach(recipes => {
      remainingRecipes.push(...recipes);
    });
    
    // Sort by score
    remainingRecipes.sort((a, b) => b.seniorScore - a.seniorScore);
    
    // Add remaining recipes until reaching 1000
    for (const recipe of remainingRecipes) {
      if (quotaManager.selected.length >= TARGET_RECIPES) break;
      
      // Directly add, ignoring quota restrictions
      quotaManager.selected.push({ 
        ...recipe, 
        classification: recipe.classification 
      });
    }
  }
  
  console.log(`✅ Selected ${quotaManager.selected.length} recipes`);
  
  // Convert to DynamoDB format
  console.log("🔄 Converting to DynamoDB format...");
  const finalItems = [];
  const categoryStats = {};
  const tagStats = {};
  
  quotaManager.selected.forEach((recipe, index) => {
    const categories = getCategory(recipe.title, recipe.tags || {});
    const habits = getDietHabits(recipe.title, recipe.ingredients || [], recipe.tags || {});
    
    // Statistics
    categories.forEach(category => {
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });
    habits.forEach(tag => {
      tagStats[tag] = (tagStats[tag] || 0) + 1;
    });
    
    const title_lc = recipe.title.toLowerCase();
    const recipeId = `json_${String(index + 1).padStart(4, '0')}`;
    
    // Handle instructions
    const instructionsText = recipe.instructions && typeof recipe.instructions === 'object' 
      ? Object.values(recipe.instructions).join(' ') 
      : (recipe.instructions || '');
    
    const item = {
      recipe_id: recipeId,
      title: recipe.title,
      title_lc,
      title_lc_first1: title_lc[0] || 'a',
      ingredients: recipe.ingredients || [],
      instructions: instructionsText,
      
      // Additional fields
      description: recipe.description || '',
      cooking_time: recipe.cooking_time || null,
      servings: recipe.servings || null,
      
      // Rating info
      rating: recipe.ratings?.rating || null,
      rating_count: recipe.ratings?.count || null,
      
      // Image information
      image_name: recipe.image_filename,
      image_url: null,
      has_image: true,
      image_display: `https://tp33-data-recipe.s3.ap-southeast-2.amazonaws.com/raw/foodspics/${recipe.image_filename}.jpg`,
      
      // Classification info
      categories: categories,
      habits,
      categories_csv: categories.join(','),
      habits_csv: habits.join(','),
      
      // Ingredient classification
      ingredient_type: recipe.classification.type,
      ingredient_subtype: recipe.classification.subtype,
      
      // search
      ingredients_text: (recipe.ingredients || []).join(' ').toLowerCase().slice(0, 4000),
      senior_score: recipe.seniorScore,
      
      // Metadata
      source: 'Kaggle_JSON',
      original_tags: recipe.tags || {},
      created_at: new Date().toISOString()
    };
    
    finalItems.push(item);
  });
  
  // Statistics
  console.log("\n📈 FINAL STATISTICS:");
  console.log("═══════════════════════════════════");
  console.log(`Total recipes: ${finalItems.length}`);
  
  console.log("\n🥘 INGREDIENT DISTRIBUTION:");
  const remainingQuotas = quotaManager.getStats();
  Object.entries(INGREDIENT_QUOTAS).forEach(([type, quotas]) => {
    console.log(`\n📊 ${type.toUpperCase()}:`);
    Object.entries(quotas).forEach(([subtype, target]) => {
      const selected = target - (remainingQuotas[type][subtype] || 0);
      console.log(`  ✅ ${subtype}: ${selected}/${target}`);
    });
  });
  
  console.log("\n📊 CATEGORY DISTRIBUTION:");
  Object.entries(categoryStats).forEach(([category, count]) => {
    const percentage = ((count / finalItems.length) * 100).toFixed(1);
    console.log(`  ✅ ${category}: ${count} recipes (${percentage}%)`);
  });
  
  console.log("\n🏷️ TOP DIET TAGS:");
  Object.entries(tagStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([tag, count]) => {
      console.log(`  ✅ ${tag}: ${count} recipes`);
    });
  
  // Write to database
  await batchWriteAll(finalItems, TABLE);
  
  console.log("\n🎉 SUCCESS! JSON recipes loaded to Recipes_i2!");
  console.log("═══════════════════════════════════");
  console.log(`📸 All ${finalItems.length} recipes have images`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});