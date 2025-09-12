import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const REGION = "ap-southeast-2";
const TABLE = "Recipes_i2";

const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

// Helper functions
const hasWord = (hay, w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(hay);
const anyWord = (hay, words) => words.some(w => hasWord(hay, w));
const notAnyWord = (hay, words) => !anyWord(hay, words);

// Define dietary restriction keywords
const dietaryKeywords = {
  egg_free: {
    exclude: ['egg', 'eggs', 'omelet', 'omelette', 'frittata', 'quiche', 'mayonnaise', 'hollandaise', 'custard', 'meringue', 'soufflé', 'carbonara', 'caesar dressing', 'aioli', 'cake', 'muffin', 'pancake', 'waffle', 'french toast'],
    include: [] // No specific include words, just absence of exclude words
  },
  dairy_free: {
    exclude: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream', 'heavy cream', 'whipped cream', 'cottage cheese', 'ricotta', 'parmesan', 'mozzarella', 'cheddar', 'dairy'],
    include: []
  },
  gluten_free: {
    exclude: ['wheat', 'flour', 'bread', 'pasta', 'noodle', 'spaghetti', 'linguine', 'penne', 'lasagna', 'ravioli', 'couscous', 'bulgur', 'semolina', 'rye', 'barley', 'gluten'],
    include: []
  },
  nut_free: {
    exclude: ['peanut', 'almond', 'walnut', 'cashew', 'pecan', 'hazelnut', 'pistachio', 'brazil nut', 'macadamia', 'pine nut', 'nuts'],
    include: []
  },
  shellfish_free: {
    exclude: ['shrimp', 'crab', 'lobster', 'scallop', 'oyster', 'clam', 'mussel', 'shellfish'],
    include: []
  },
  fish_free: {
    exclude: ['fish', 'salmon', 'tuna', 'cod', 'bass', 'tilapia', 'snapper', 'halibut', 'trout', 'mackerel', 'anchovy', 'sardine'],
    include: []
  },
  soy_free: {
    exclude: ['soy', 'tofu', 'miso', 'soy sauce', 'tamari', 'tempeh', 'edamame'],
    include: []
  },
  low_sodium: {
    exclude: [],
    include: ['low sodium', 'low salt', 'no salt', 'salt free', 'reduced sodium']
  },
  low_sugar: {
    exclude: [],
    include: ['low sugar', 'sugar free', 'no sugar', 'unsweetened', 'diabetic']
  },
  heart_healthy: {
    exclude: [],
    include: ['heart healthy', 'low fat', 'lean', 'healthy', 'nutritious']
  },
  diabetic_friendly: {
    exclude: [],
    include: ['diabetic', 'diabetes', 'blood sugar', 'low carb', 'low glycemic']
  },
  soft_food: {
    exclude: [],
    include: ['soft', 'tender', 'easy to chew', 'pureed', 'smooth', 'creamy']
  }
};

function analyzeRecipeForDiet(recipe, dietType) {
  const keywords = dietaryKeywords[dietType];
  if (!keywords) return false;
  
  const text = `${recipe.title.toLowerCase()} ${(recipe.ingredients || []).join(' ').toLowerCase()} ${recipe.instructions.toLowerCase()}`;
  
  // If there are exclude keywords, recipe must NOT contain them
  if (keywords.exclude.length > 0 && anyWord(text, keywords.exclude)) {
    return false;
  }
  
  // If there are include keywords, recipe must contain at least one
  if (keywords.include.length > 0 && !anyWord(text, keywords.include)) {
    return false;
  }
  
  // For allergen-free diets, be more conservative
  if (dietType.endsWith('_free') && keywords.exclude.length > 0) {
    // Must have substantial ingredients and clear categories
    const hasSubstantialIngredients = (recipe.ingredients || []).length >= 3;
    const hasCategories = (recipe.categories || []).length > 0;
    return hasSubstantialIngredients && hasCategories;
  }
  
  return true;
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
  console.log("🏷️  Updating Diet Tags in DynamoDB");
  console.log("===================================\\n");
  
  // Scan all existing recipes
  const recipes = await scanAllRecipes();
  
  if (recipes.length === 0) {
    console.log("❌ No recipes found in database");
    return;
  }
  
  // Analyze current diet tag distribution
  console.log("\\n📊 Current diet tag distribution:");
  const currentTags = {};
  
  recipes.forEach(recipe => {
    const habits = recipe.habits || [];
    habits.forEach(habit => {
      currentTags[habit] = (currentTags[habit] || 0) + 1;
    });
  });
  
  Object.entries(currentTags)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => {
      console.log(`  ${tag}: ${count} recipes`);
    });
  
  // Analyze each recipe for missing diet tags
  console.log("\\n🔍 Analyzing recipes for missing diet tags...");
  
  const updates = [];
  const newTagCounts = {};
  
  recipes.forEach((recipe, index) => {
    if (index % 100 === 0) {
      console.log(`   Analyzed ${index}/${recipes.length} recipes...`);
    }
    
    const currentHabits = new Set(recipe.habits || []);
    const newHabits = [...currentHabits];
    
    // Check each diet type
    Object.keys(dietaryKeywords).forEach(dietType => {
      if (!currentHabits.has(dietType) && analyzeRecipeForDiet(recipe, dietType)) {
        newHabits.push(dietType);
        newTagCounts[dietType] = (newTagCounts[dietType] || 0) + 1;
      }
    });
    
    // If new habits were added, queue for update
    if (newHabits.length > currentHabits.size) {
      updates.push({
        recipe_id: recipe.recipe_id,
        title: recipe.title,
        oldHabits: [...currentHabits],
        newHabits: newHabits.sort(),
        addedTags: newHabits.filter(h => !currentHabits.has(h))
      });
    }
  });
  
  console.log(`\\n📈 Found ${updates.length} recipes that need diet tag updates`);
  
  if (updates.length === 0) {
    console.log("✅ All recipes already have appropriate diet tags!");
    return;
  }
  
  // Show what new tags will be added
  console.log("\\n🏷️  New diet tags to be added:");
  Object.entries(newTagCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => {
      console.log(`  ${tag}: +${count} recipes`);
    });
  
  // Show first 10 examples
  console.log("\\n📋 First 10 recipes to update:");
  updates.slice(0, 10).forEach((update, i) => {
    console.log(`${i+1}. ${update.title}`);
    console.log(`   Adding: ${update.addedTags.join(', ')}`);
    console.log('');
  });
  
  // Perform updates in batches
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
    
    if ((i + 1) % 50 === 0) {
      console.log(`   Updated ${i + 1}/${updates.length} recipes (${successCount} success, ${failCount} failed)`);
    }
    
    // Small delay to avoid throttling
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log("\\n🎉 UPDATE COMPLETE!");
  console.log("====================");
  console.log(`✅ Successfully updated: ${successCount} recipes`);
  console.log(`❌ Failed updates: ${failCount} recipes`);
  
  // Final summary
  console.log("\\n📊 New diet tag additions:");
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