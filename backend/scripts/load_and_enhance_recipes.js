import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGION = "ap-southeast-2";
const TABLE = "Recipes_i2";
const TARGET_RECIPES = 1000;

// Ingredient quota targets
const INGREDIENT_QUOTAS = {
  meat: { total: 300, chicken: 120, pork: 100, beef: 70, lamb: 10 },
  seafood: { total: 150, fish: 100, shellfish: 30, other: 20 },
  vegetable: { total: 300, leafy: 80, root: 80, gourd: 60, mushroom: 40, other: 40 },
  staple: { total: 200, rice: 80, pasta: 60, beans: 40, other: 20 },
  dairy_egg: { total: 100, egg: 60, dairy: 40 }
};

// Category quota targets
const CATEGORY_QUOTAS = {
  dinner: 300,        // Main dishes - largest portion
  lunch: 200,         // Lunch items
  breakfast: 150,     // Breakfast items
  snack: 100,         // Snacks - increased for better coverage
  soup: 80,           // Light soups (excluding main meal soups)
  salad: 70,          // Salads
  dessert: 60,        // Desserts
  beverage: 40,       // Beverages
  uncategorized: 0    // No uncategorized recipes
};

const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

// Nutrition API configuration
const NUTRITION_API = "https://0brixnxwq3.execute-api.ap-southeast-2.amazonaws.com/prod/match";

// --- Utility Functions ---
const W = (s) => (s || '').toLowerCase().trim();
const hasWord = (hay, w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(hay);
const anyWord = (hay, words) => words.some(w => hasWord(hay, w));

// Enhanced allergen detection based on US food allergy dataset
const ENHANCED_ALLERGEN_MAP = {
  dairy: {
    obvious: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream', 'heavy cream', 'whipped cream'],
    hidden: ['casein', 'whey', 'lactose', 'ghee', 'cottage cheese', 'ricotta', 'parmesan', 'mozzarella', 'cheddar', 'goat cheese', 'feta', 'brie', 'mascarpone'],
    crossContamination: ['bread', 'chocolate', 'salad dressing', 'soup'],
    severity: 'high'
  },
  nuts: {
    obvious: ['peanut', 'almond', 'walnut', 'cashew', 'pecan', 'hazelnut', 'pistachio'],
    hidden: ['peanut oil', 'almond milk', 'almond flour', 'nutmeg', 'coconut', 'pine nut', 'brazil nut', 'macadamia', 'chestnut'],
    crossContamination: ['granola', 'trail mix', 'baked goods', 'asian cuisine', 'pesto'],
    severity: 'critical'
  },
  seafood: {
    obvious: ['fish', 'salmon', 'tuna', 'cod', 'bass', 'tilapia', 'shrimp', 'crab', 'lobster'],
    hidden: ['fish sauce', 'worcestershire sauce', 'caesar dressing', 'anchovies', 'surimi'],
    crossContamination: ['fried foods', 'shared grills', 'asian restaurants'],
    severity: 'high'
  },
  eggs: {
    obvious: ['egg', 'eggs', 'omelet', 'omelette', 'frittata', 'quiche'],
    hidden: ['mayonnaise', 'hollandaise', 'custard', 'meringue', 'pasta', 'cake', 'muffin', 'pancake', 'waffle', 'french toast', 'ice cream', 'marshmallow'],
    crossContamination: ['baked goods', 'breakfast items', 'desserts'],
    severity: 'moderate'
  },
  gluten: {
    obvious: ['wheat', 'flour', 'bread', 'pasta', 'noodle', 'barley', 'rye'],
    hidden: ['soy sauce', 'beer', 'malt', 'brewer\'s yeast', 'seitan', 'couscous', 'bulgur', 'spelt'],
    crossContamination: ['oats', 'shared surfaces', 'fried foods'],
    severity: 'moderate'
  },
  soy: {
    obvious: ['soy', 'soy sauce', 'tofu', 'tempeh', 'miso', 'edamame'],
    hidden: ['lecithin', 'textured vegetable protein', 'vegetable oil', 'asian sauces'],
    crossContamination: ['asian cuisine', 'processed foods'],
    severity: 'moderate'
  }
};

// Additional ingredient detection keywords
const INGREDIENT_KEYWORDS = {
  fish: ['fish', 'salmon', 'tuna', 'cod', 'bass', 'tilapia', 'trout', 'mackerel', 'sardine', 'anchovy', 'halibut', 'sole', 'flounder'],
  shellfish: ['shrimp', 'crab', 'lobster', 'scallop', 'oyster', 'mussel', 'clam', 'crawfish', 'crayfish', 'prawn'],
  soft_food_keywords: ['soup', 'puree', 'mashed', 'smooth', 'creamy', 'soft', 'yogurt', 'pudding', 'smoothie', 'porridge', 'custard', 'mousse']
};

// Nutrition thresholds for health tags
const NUTRITION_THRESHOLDS = {
  low_sodium: { sodium_mg: 600 },
  diabetic_friendly: {
    carbs_g: 30,
    sugar_g: 10,
    sodium_mg: 800
  },
  heart_healthy: {
    sodium_mg: 600,
    saturated_fat_g: 5
  },
  low_sugar: { sugar_g: 5 }
};

// --- Nutrition Functions ---
function adjustNutritionValue(value, label) {
  if (value == null || isNaN(Number(value))) return 0;

  const num = Number(value);
  if (num <= 0) return 0;

  const lowerLabel = label.toLowerCase();

  // Sodium adjustment - more aggressive for very high values
  if (lowerLabel.includes('sodium')) {
    if (num > 10000) return Math.round(num / 1000 * 200);
    if (num > 5000) return Math.round(num / 1000 * 400);
    if (num > 2000) return Math.round(num * 0.6);
    return num;
  }

  // Sugar adjustment
  if (lowerLabel.includes('sugar')) {
    if (num > 100) return Math.round(num * 0.3);
    return num;
  }

  // Carbs adjustment
  if (lowerLabel.includes('carb')) {
    if (num > 200) return Math.round(num * 0.4);
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

// --- Classification Configuration ---
const SOUP_NEGATIVES = [
  'fried rice', 'risotto', 'pilaf', 'stir-fry',
  'paella', 'biryani', 'casserole', 'baked pasta', 'noodle stir-fry',
  // Main meal soups that should be categorized as dinner/lunch, not soup
  'pho', 'ramen', 'noodle soup', 'congee', 'pasta soup', 'beef stew',
  'chicken stew', 'meat soup', 'hearty soup', 'thick soup',
  // Additional main meal soups
  'udon', 'soba', 'laksa', 'tonkotsu', 'miso soup with noodles',
  'wonton soup', 'hot pot', 'shabu shabu', 'korean soup',
  'dumpling soup', 'rice noodle soup', 'beef noodle soup'
];

const BEVERAGE_KEYWORDS = {
  hot_indicators: ['hot', 'warm'],
  cold_indicators: ['iced', 'cold', 'frozen'],
  coffee_types: ['coffee', 'latte', 'espresso', 'mocha', 'cappuccino'],
  tea_types: ['tea', 'chai', 'matcha', 'green tea', 'black tea'],
  smoothie_types: ['smoothie', 'shake', 'milkshake'],
  juice_types: ['juice', 'lemonade'],
  other_beverages: ['frappe', 'punch', 'mocktail', 'cocktail', 'hot chocolate', 'cocoa']
};

// --- Classification Functions ---
function getBeverageTags(title) {
  const titleLower = title.toLowerCase();
  const tags = [];

  // Temperature tags
  if (anyWord(titleLower, BEVERAGE_KEYWORDS.hot_indicators)) {
    tags.push('hot');
  } else if (anyWord(titleLower, BEVERAGE_KEYWORDS.cold_indicators)) {
    tags.push('cold');
  } else {
    tags.push('cold'); // Default to cold
  }

  // Type tags
  if (anyWord(titleLower, BEVERAGE_KEYWORDS.coffee_types)) tags.push('coffee');
  if (anyWord(titleLower, BEVERAGE_KEYWORDS.tea_types)) tags.push('tea');
  if (anyWord(titleLower, BEVERAGE_KEYWORDS.smoothie_types)) tags.push('smoothie');
  if (anyWord(titleLower, BEVERAGE_KEYWORDS.juice_types)) tags.push('juice');

  return tags;
}

function isSoup(title, ingredients) {
  const titleLower = title.toLowerCase();
  const ingredientsText = (ingredients || []).join(' ').toLowerCase();

  // Strong negation check first
  for (const negative of SOUP_NEGATIVES) {
    if (titleLower.includes(negative)) {
      return { result: false, reason: `blocked_by: ${negative}` };
    }
  }

  // Positive soup indicators (light soups only, not main meals)
  if (anyWord(titleLower, ['soup', 'chowder', 'bisque', 'gazpacho', 'minestrone'])) {
    return { result: true, reason: 'title_keyword' };
  }

  return { result: false, reason: 'no_soup_signal' };
}

function classifyRecipe(title, ingredients) {
  const titleLower = W(title);
  const ingredientsText = (ingredients || []).join(' ').toLowerCase();
  const combined = `${titleLower} ${ingredientsText}`;
  const debug = { title, rules: [] };

  // Priority 1: Dessert (highest priority)
  if (anyWord(combined, [
    'chocolate cake', 'brownie', 'ice cream', 'candy', 'frosting',
    'chocolate chip cookie', 'sugar cookie', 'cheesecake', 'pie',
    'chocolate mousse', 'tiramisu', 'fudge', 'caramel', 'cupcake', 'pudding'
  ])) {
    debug.rules.push('dessert_keyword');
    return { primary: 'dessert', all: ['dessert'], secondary: [], debug };
  }

  // Priority 2: Beverage (new category)
  const allBeverageKeywords = [
    ...BEVERAGE_KEYWORDS.coffee_types,
    ...BEVERAGE_KEYWORDS.tea_types,
    ...BEVERAGE_KEYWORDS.smoothie_types,
    ...BEVERAGE_KEYWORDS.juice_types,
    ...BEVERAGE_KEYWORDS.other_beverages
  ];

  if (anyWord(titleLower, allBeverageKeywords)) {
    const beverageTags = getBeverageTags(title);
    debug.rules.push('beverage_keyword', `tags: ${beverageTags.join(',')}`);
    return { primary: 'beverage', all: ['beverage'], secondary: beverageTags, debug };
  }

  // Priority 3: Soup (with strong negation)
  const soupCheck = isSoup(title, ingredients);
  if (soupCheck.result) {
    debug.rules.push(soupCheck.reason);
    return { primary: 'soup', all: ['soup'], secondary: [], debug };
  } else if (soupCheck.reason.startsWith('blocked_by')) {
    debug.rules.push(soupCheck.reason);
  }

  // Priority 4: Breakfast
  if (anyWord(combined, [
    'breakfast', 'morning', 'pancake', 'pancakes', 'waffle', 'waffles',
    'oatmeal', 'overnight oats', 'cereal', 'granola', 'muesli', 'porridge', 'toast',
    'muffin', 'muffins', 'bagel', 'bagels', 'scone', 'scones',
    'omelet', 'omelette', 'scrambled eggs', 'fried eggs', 'brunch', 'hash brown', 'frittata', 'french toast'
  ])) {
    debug.rules.push('breakfast_keyword');
    return { primary: 'breakfast', all: ['breakfast'], secondary: [], debug };
  }

  // Priority 5: Snack (expanded for better coverage)
  if (anyWord(combined, [
    // Original snacks
    'chips', 'dip', 'trail mix', 'jerky', 'energy ball', 'energy bites',
    'granola bar', 'protein bar', 'popcorn', 'crackers',
    // Dairy-based snacks
    'cheese and crackers', 'yogurt parfait', 'cottage cheese',
    // Vegetable snacks
    'veggie sticks', 'carrot sticks', 'celery sticks', 'cucumber slices', 'hummus',
    // Finger foods
    'finger food', 'appetizer', 'canapé', 'pinwheel', 'roll-up',
    // Nuts and seeds (safe - not breakfast/dessert)
    'mixed nuts', 'roasted nuts', 'seeds', 'sunflower seeds', 'pumpkin seeds',
    // Fruit-based snacks (safe - not dessert)
    'dried fruit', 'fruit leather', 'fruit roll', 'apple slices', 'banana chips',
    // Asian snacks (safe - unique category)
    'rice cake', 'rice cracker', 'wasabi peas', 'seaweed snack',
    // Healthy snacks (safe - not other categories)
    'kale chips', 'veggie chips', 'protein bites', 'chia pudding',
    // Party snacks (safe - appetizer style)
    'cheese ball', 'deviled eggs', 'stuffed mushrooms',
    // General snack terms
    'snack', 'bite-sized', 'small portion', 'quick bite', 'bite'
  ])) {
    debug.rules.push('snack_keyword');
    return { primary: 'snack', all: ['snack'], secondary: [], debug };
  }

  // Priority 6: Salad (relaxed rules - allow protein salads)
  if (anyWord(titleLower, ['salad'])) {
    const secondary = [];
    if (anyWord(ingredientsText, [
      'chicken', 'beef', 'pork', 'ham', 'bacon', 'turkey', 'tuna', 'salmon',
      'shrimp', 'prawn', 'tofu', 'tempeh', 'egg', 'eggs', 'chickpea'
    ])) {
      secondary.push('protein_salad');
    }
    debug.rules.push('salad_keyword');
    return { primary: 'salad', all: ['salad'], secondary, debug };
  }

  // Priority 7: Main dishes (lunch and dinner can coexist)
  const categories = new Set();

  // Lunch-specific items
  if (anyWord(combined, ['lunch', 'sandwich', 'wrap', 'burger', 'burrito', 'taco', 'pita', 'panini', 'sub'])) {
    categories.add('lunch');
    debug.rules.push('lunch_keyword');
  }

  // Dinner items (many can also be lunch)
  if (anyWord(combined, [
    'dinner', 'casserole', 'stew', 'roast', 'pasta', 'rice', 'noodle',
    'stir-fry', 'gratin', 'curry', 'chicken', 'beef', 'pork', 'fish'
  ])) {
    categories.add('dinner');
    debug.rules.push('dinner_keyword');
  }

  // Main protein + main carb = dinner
  const hasProtein = anyWord(combined, ['chicken', 'beef', 'pork', 'fish', 'seafood']);
  const hasCarb = anyWord(combined, ['rice', 'noodle', 'pasta']);
  if (hasProtein && hasCarb) {
    categories.add('dinner');
    debug.rules.push('protein_carb_combo');
  }

  // No category matched - return uncategorized
  if (categories.size === 0) {
    debug.rules.push('no_match');
    return { primary: 'uncategorized', all: [], secondary: [], debug };
  }

  // Return object with primary category and all categories
  const allCategories = Array.from(categories);
  const primaryCategory = categories.has('dinner') ? 'dinner' :
    categories.has('lunch') ? 'lunch' : 'dinner';

  return {
    primary: primaryCategory,
    all: allCategories,
    secondary: [],
    debug
  };
}

// --- Ingredient Analysis ---
function analyzeIngredients(ingredients) {
  const ingredientsText = (ingredients || []).join(' ').toLowerCase();

  return {
    hasMeat: anyWord(ingredientsText, [
      'chicken', 'beef', 'pork', 'lamb', 'fish', 'seafood', 'bacon', 'ham', 'turkey'
    ]),
    hasDairy: anyWord(ingredientsText, [
      'milk', 'cheese', 'butter', 'cream', 'yogurt', 'ghee', 'sour cream'
    ]),
    hasEggs: anyWord(ingredientsText, ['egg', 'eggs', 'mayonnaise']),
    hasGluten: anyWord(ingredientsText, [
      'wheat', 'flour', 'bread', 'pasta', 'barley', 'rye', 'noodle'
    ]),
    hasNuts: anyWord(ingredientsText, [
      'peanut', 'almond', 'walnut', 'cashew', 'pecan', 'hazelnut'
    ]),
    hasSugar: anyWord(ingredientsText, [
      'sugar', 'syrup', 'honey', 'molasses', 'fructose'
    ]),
    ingredientText: ingredientsText
  };
}

// --- Allergen Detection ---
function detectAllergens(ingredients) {
  const ingredientsText = (ingredients || []).join(' ').toLowerCase();
  const allergenAnalysis = {};

  Object.entries(ENHANCED_ALLERGEN_MAP).forEach(([allergen, config]) => {
    let score = 0;
    let present = false;
    let sources = [];

    // Check obvious allergens
    if (anyWord(ingredientsText, config.obvious)) {
      score += 3;
      present = true;
      sources.push('obvious');
    }

    // Check hidden allergens
    if (anyWord(ingredientsText, config.hidden)) {
      score += 2;
      present = true;
      sources.push('hidden');
    }

    // Check cross-contamination risk
    if (anyWord(ingredientsText, config.crossContamination)) {
      score += 1;
      if (!present) sources.push('cross-contamination');
    }

    if (present || score > 0) {
      let riskLevel = 'low';
      if (score >= 4) riskLevel = 'critical';
      else if (score >= 3) riskLevel = 'high';
      else if (score >= 2) riskLevel = 'moderate';

      allergenAnalysis[allergen] = {
        score,
        riskLevel,
        present,
        sources
      };
    }
  });

  return allergenAnalysis;
}

// --- Habit Tags Generation ---
function generateHabitTags(analysis, allergenAnalysis, nutrition, title = '') {
  const habits = new Set();

  // Diet tags
  if (!analysis.hasMeat) {
    habits.add('vegetarian');

    if (!analysis.hasDairy && !analysis.hasEggs) {
      habits.add('vegan');
    }
  }

  // Allergy-free tags
  if (!analysis.hasDairy) habits.add('dairy_free');
  if (!analysis.hasEggs) habits.add('egg_free');
  if (!analysis.hasGluten) habits.add('gluten_free');
  if (!analysis.hasNuts) habits.add('nut_free');

  // Additional allergy-free tags based on ingredient analysis
  const ingredientText = analysis.ingredientText || '';

  // Fish-free check
  if (!anyWord(ingredientText, INGREDIENT_KEYWORDS.fish)) {
    habits.add('fish_free');
  }

  // Shellfish-free check
  if (!anyWord(ingredientText, INGREDIENT_KEYWORDS.shellfish)) {
    habits.add('shellfish_free');
  }

  // Soy-free check
  if (!anyWord(ingredientText, ENHANCED_ALLERGEN_MAP.soy.obvious.concat(ENHANCED_ALLERGEN_MAP.soy.hidden))) {
    habits.add('soy_free');
  }

  // Soft food check - more precise detection for elderly users
  const softFoodIndicators = [
    // Definitely soft foods
    'soup', 'puree', 'mashed', 'pudding', 'smoothie', 'porridge', 'custard', 'mousse',
    'yogurt', 'oatmeal', 'congee', 'broth', 'blended',
    // Soft preparation methods
    'steamed', 'poached', 'slow cooked', 'tender'
  ];

  const hardFoodBlockers = [
    // Foods that are definitely not soft
    'wrap', 'burger', 'sandwich', 'pizza', 'taco', 'chips', 'crackers',
    'nuts', 'raw vegetables', 'steak', 'fried', 'crispy', 'crunchy',
    // Additional hard foods
    'toast', 'bagel', 'biscuit', 'pretzel', 'granola', 'cereal',
    'apple', 'carrot', 'celery', 'broccoli', 'cauliflower',
    'grilled', 'roasted', 'baked bread', 'crusty', 'firm'
  ];

  const titleLower = title.toLowerCase();
  const combinedText = `${titleLower} ${ingredientText}`;

  // Block if contains hard food indicators
  const hasHardFood = anyWord(combinedText, hardFoodBlockers);

  // Check for soft food indicators
  const hasSoftFood = anyWord(combinedText, softFoodIndicators);

  if (hasSoftFood && !hasHardFood) {
    habits.add('soft_food');
  }

  // Allergen presence tags
  Object.entries(allergenAnalysis).forEach(([allergen, data]) => {
    if (data.present) {
      habits.add(`contains_${allergen}`);
      if (data.riskLevel === 'critical' || data.score >= 4) {
        habits.add('high_allergy_risk');
      }
    }
  });

  // Nutrition-based health tags
  if (nutrition) {
    // Low sodium
    if (nutrition.sodium_mg <= NUTRITION_THRESHOLDS.low_sodium.sodium_mg) {
      habits.add('low_sodium');
    }

    // Diabetic friendly
    const diabetic = NUTRITION_THRESHOLDS.diabetic_friendly;
    if (nutrition.carbs_g <= diabetic.carbs_g &&
      nutrition.sugar_g <= diabetic.sugar_g &&
      nutrition.sodium_mg <= diabetic.sodium_mg) {
      habits.add('diabetic_friendly');
    }

    // Heart healthy
    const heart = NUTRITION_THRESHOLDS.heart_healthy;
    if (nutrition.sodium_mg <= heart.sodium_mg &&
      nutrition.saturated_fat_g <= heart.saturated_fat_g) {
      habits.add('heart_healthy');
    }

    // Low sugar
    if (nutrition.sugar_g <= NUTRITION_THRESHOLDS.low_sugar.sugar_g) {
      habits.add('low_sugar');
    }
  } else {
    // Fallback to basic sugar detection if no nutrition data
    if (!analysis.hasSugar) {
      habits.add('low_sugar');
    }
  }

  return Array.from(habits);
}

// --- Quota Manager ---
class QuotaManager {
  constructor() {
    this.quotas = JSON.parse(JSON.stringify(INGREDIENT_QUOTAS));
  }

  canAccept(ingredientType, ingredientSubtype) {
    return this.quotas[ingredientType] &&
      this.quotas[ingredientType][ingredientSubtype] > 0;
  }

  consume(ingredientType, ingredientSubtype) {
    if (this.canAccept(ingredientType, ingredientSubtype)) {
      this.quotas[ingredientType][ingredientSubtype]--;
      this.quotas[ingredientType].total--;
      return true;
    }
    return false;
  }

  getStats() {
    return this.quotas;
  }
}

// --- Category Quota Manager ---
class CategoryQuotaManager {
  constructor() {
    this.quotas = JSON.parse(JSON.stringify(CATEGORY_QUOTAS));
  }

  canAccept(category) {
    return this.quotas[category] > 0;
  }

  consume(category) {
    if (this.canAccept(category)) {
      this.quotas[category]--;
      return true;
    }
    return false;
  }

  getStats() {
    return this.quotas;
  }

  getRemainingTotal() {
    return Object.values(this.quotas).reduce((sum, count) => sum + count, 0);
  }
}

// --- Logging Setup ---
const logFile = path.join(__dirname, "load_output.log");
const logStream = fs.createWriteStream(logFile, { flags: 'w' });

function log(message) {
  console.log(message);
  logStream.write(message + '\n');
}

// --- Main Processing ---
async function main() {
  const startTime = new Date();
  log("🥗 Loading and Enhancing Recipe Database");
  log(`⏰ Started at: ${startTime.toISOString()}`);
  log("═══════════════════════════════════════════\n");

  log("📖 Reading recipes_with_images.json...");
  const rawData = fs.readFileSync(path.join(__dirname, "recipes_with_images.json"), 'utf8');
  const allRecipes = JSON.parse(rawData);

  log(`📊 Found ${allRecipes.length.toLocaleString()} total recipes`);
  log(`🎯 Target: ${TARGET_RECIPES} recipes with enhanced processing\n`);

  const quotaManager = new QuotaManager();
  const categoryQuotaManager = new CategoryQuotaManager();
  const finalItems = [];
  const skippedItems = [];
  const categoryStats = {};
  const tagStats = {};
  let processed = 0;

  log("🔄 Processing recipes with full enhancement...\n");

  for (const recipe of allRecipes) {
    // Stop when all category quotas are exhausted
    if (categoryQuotaManager.getRemainingTotal() === 0) break;

    processed++;
    if (processed % 500 === 0) {
      log(`   Processed ${processed}/${allRecipes.length} recipes, selected ${finalItems.length}...`);
    }

    // Basic validation
    if (!recipe.title ||
      !recipe.ingredients ||
      !Array.isArray(recipe.ingredients) ||
      recipe.ingredients.length === 0) {
      continue;
    }

    // Classification
    const classificationResult = classifyRecipe(recipe.title, recipe.ingredients);

    // Skip uncategorized recipes
    if (classificationResult.primary === 'uncategorized') {
      skippedItems.push({
        title: recipe.title,
        reason: classificationResult.debug.rules,
        debug: classificationResult.debug
      });
      continue;
    }

    // Ingredient analysis
    const analysis = analyzeIngredients(recipe.ingredients);

    // Allergen detection
    const allergenAnalysis = detectAllergens(recipe.ingredients);

    // Nutrition analysis (with rate limiting)
    let nutrition = null;
    try {
      nutrition = await fetchNutrition(recipe.ingredients);
      // Small delay to avoid API rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      const warnMsg = `⚠️ Nutrition fetch failed for "${recipe.title}": ${error.message}`;
      console.warn(warnMsg);
      logStream.write(warnMsg + '\n');
    }

    // Generate habit tags
    const habits = generateHabitTags(analysis, allergenAnalysis, nutrition, recipe.title);

    // Check quotas - both ingredient and category must have space
    const primaryCategory = classificationResult.primary;
    const ingredientType = analysis.primaryType;
    const ingredientSubtype = analysis.primarySubtype;

    // Skip if either quota is exhausted
    if (!categoryQuotaManager.canAccept(primaryCategory)) {
      skippedItems.push({
        title: recipe.title,
        reason: [`category_quota_exhausted: ${primaryCategory}`],
        debug: classificationResult.debug
      });
      continue;
    }

    if (ingredientType && ingredientSubtype && !quotaManager.canAccept(ingredientType, ingredientSubtype)) {
      skippedItems.push({
        title: recipe.title,
        reason: [`ingredient_quota_exhausted: ${ingredientType}/${ingredientSubtype}`],
        debug: classificationResult.debug
      });
      continue;
    }

    // Consume quotas
    categoryQuotaManager.consume(primaryCategory);
    if (ingredientType && ingredientSubtype) {
      quotaManager.consume(ingredientType, ingredientSubtype);
    }

    // Create final recipe object
    const finalRecipe = {
      recipe_id: `json_${String(finalItems.length).padStart(4, '0')}`,
      title: recipe.title,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions || recipe.directions || '',

      // Classification
      categories: classificationResult.all,
      categories_csv: classificationResult.all.join(','),
      secondary_tags: classificationResult.secondary || [],
      classification_debug: classificationResult.debug,

      // Tags
      habits: habits,
      habits_csv: habits.join(','),

      // Analysis results
      allergen_analysis: allergenAnalysis,
      nutrition: nutrition,

      // Image and metadata
      has_image: !!recipe.image_filename,
      image_display: recipe.image_filename ?
        `https://tp33-data-recipe.s3.ap-southeast-2.amazonaws.com/raw/foodspics/${recipe.image_filename}.jpg` : null,
      image_name: recipe.image_filename,

      // Metadata
      created_at: new Date().toISOString(),
      source: "recipes_with_images",
      rating: recipe.rating || 4.0,
      rating_count: recipe.rating_count || 1,
      servings: recipe.servings || 4,
      cooking_time: recipe.cooking_time || null,
      description: recipe.description || ""
    };

    finalItems.push(finalRecipe);

    // Update statistics (count each category separately)
    classificationResult.all.forEach(cat => {
      categoryStats[cat] = (categoryStats[cat] || 0) + 1;
    });
    habits.forEach(tag => {
      tagStats[tag] = (tagStats[tag] || 0) + 1;
    });
  }

  // Statistics
  log("\n📈 PROCESSING COMPLETE!");
  log("═══════════════════════════════════");
  log(`✅ Selected ${finalItems.length} recipes from ${processed} processed`);
  log(`⏭️ Skipped ${skippedItems.length} recipes due to quota/validation issues`);

  log("\n📊 CATEGORY DISTRIBUTION:");
  Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      const percentage = ((count / finalItems.length) * 100).toFixed(1);
      const quota = CATEGORY_QUOTAS[category] || 0;
      const remaining = categoryQuotaManager.getStats()[category] || 0;
      log(`  📋 ${category}: ${count} recipes (${percentage}%) [${quota - remaining}/${quota} quota used]`);
    });

  log("\n📈 INGREDIENT QUOTA USAGE:");
  const ingredientStats = quotaManager.getStats();
  Object.entries(ingredientStats).forEach(([type, data]) => {
    const used = INGREDIENT_QUOTAS[type].total - data.total;
    log(`  🥘 ${type}: ${used}/${INGREDIENT_QUOTAS[type].total} used (${data.total} remaining)`);
    Object.entries(data).forEach(([subtype, count]) => {
      if (subtype !== 'total' && INGREDIENT_QUOTAS[type][subtype]) {
        const subtypeUsed = INGREDIENT_QUOTAS[type][subtype] - count;
        log(`    └─ ${subtype}: ${subtypeUsed}/${INGREDIENT_QUOTAS[type][subtype]} used`);
      }
    });
  });

  log("\n🏷️ TOP HABIT TAGS:");
  Object.entries(tagStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([tag, count]) => {
      const percentage = ((count / finalItems.length) * 100).toFixed(1);
      log(`  🏷️ ${tag}: ${count} recipes (${percentage}%)`);
    });

  // Show sample skipped recipes for debugging
  if (skippedItems.length > 0) {
    log("\n🚫 SAMPLE SKIPPED RECIPES (first 10):");
    skippedItems.slice(0, 10).forEach((item, index) => {
      log(`  ${index + 1}. "${item.title}" - Reason: ${item.reason.join(', ')}`);
    });
  }

  // Upload to DynamoDB
  log("\n🚀 Uploading to DynamoDB...");
  const batchSize = 25;
  let uploaded = 0;

  for (let i = 0; i < finalItems.length; i += batchSize) {
    const batch = finalItems.slice(i, i + batchSize);

    const params = {
      RequestItems: {
        [TABLE]: batch.map(item => ({
          PutRequest: { Item: item }
        }))
      }
    };

    try {
      await ddb.send(new BatchWriteCommand(params));
      uploaded += batch.length;

      if (uploaded % 100 === 0 || uploaded === finalItems.length) {
        log(`   📤 Uploaded ${uploaded}/${finalItems.length} recipes...`);
      }
    } catch (error) {
      const errorMsg = `❌ Error uploading batch starting at ${i}: ${error.message}`;
      console.error(errorMsg);
      logStream.write(errorMsg + '\n');
    }
  }

  const endTime = new Date();
  const duration = Math.round((endTime - startTime) / 1000);

  log("\n🎉 SUCCESS!");
  log("================");
  log(`✅ Successfully uploaded ${uploaded} enhanced recipes to DynamoDB`);
  log(`📊 Database: ${TABLE}`);
  log(`🔗 Enhanced with: allergen detection, nutrition analysis, and smart classification`);
  log(`⏰ Completed at: ${endTime.toISOString()}`);
  log(`⌛ Total duration: ${duration} seconds`);

  // Close log file
  logStream.end();
}

// Execute
main().catch((err) => {
  const errorMsg = `❌ Critical Error: ${err.message}`;
  console.error(errorMsg);
  if (logStream && !logStream.destroyed) {
    logStream.write(errorMsg + '\n');
    logStream.end();
  }
  process.exit(1);
});