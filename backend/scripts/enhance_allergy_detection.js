import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const REGION = "ap-southeast-2";
const TABLE = "Recipes_i2";

const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

// Enhanced allergen detection based on US food allergy dataset insights
const ENHANCED_ALLERGEN_MAP = {
  // Dairy - most common allergen
  dairy: {
    obvious: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream', 'heavy cream', 'whipped cream'],
    hidden: ['casein', 'whey', 'lactose', 'ghee', 'cottage cheese', 'ricotta', 'parmesan', 'mozzarella', 'cheddar', 'goat cheese', 'feta', 'brie', 'mascarpone'],
    crossContamination: ['bread', 'chocolate', 'salad dressing', 'soup'],
    severity: 'high' // High IgE response in dataset
  },
  
  // Nuts - severe reaction risk
  nuts: {
    obvious: ['peanut', 'almond', 'walnut', 'cashew', 'pecan', 'hazelnut', 'pistachio'],
    hidden: ['peanut oil', 'almond milk', 'almond flour', 'nutmeg', 'coconut', 'pine nut', 'brazil nut', 'macadamia', 'chestnut'],
    crossContamination: ['granola', 'trail mix', 'baked goods', 'asian cuisine', 'pesto'],
    severity: 'critical' // Highest severity in dataset
  },
  
  // Seafood - complex category
  seafood: {
    obvious: ['fish', 'salmon', 'tuna', 'cod', 'bass', 'tilapia', 'shrimp', 'crab', 'lobster'],
    hidden: ['anchovy', 'worcestershire sauce', 'fish sauce', 'oyster sauce', 'caesar dressing', 'surimi'],
    crossContamination: ['asian dishes', 'sauces', 'soups'],
    severity: 'high'
  },
  
  // Shellfish - separate from fish
  shellfish: {
    obvious: ['shrimp', 'crab', 'lobster', 'scallop', 'oyster', 'clam', 'mussel'],
    hidden: ['seafood stock', 'bouillabaisse', 'paella', 'jambalaya'],
    crossContamination: ['seafood restaurants', 'fried foods'],
    severity: 'critical'
  },
  
  // Gluten - widespread hidden presence
  gluten: {
    obvious: ['wheat', 'flour', 'bread', 'pasta', 'noodle', 'cereal'],
    hidden: ['soy sauce', 'malt', 'barley', 'rye', 'bulgur', 'semolina', 'spelt', 'kamut', 'triticale', 'seitan'],
    crossContamination: ['oats', 'fried foods', 'sauces', 'seasonings'],
    severity: 'moderate'
  },
  
  // Eggs - often hidden in baked goods
  eggs: {
    obvious: ['egg', 'eggs', 'omelet', 'omelette', 'frittata', 'quiche'],
    hidden: ['mayonnaise', 'hollandaise', 'custard', 'meringue', 'pasta', 'cake', 'muffin', 'pancake', 'waffle', 'french toast', 'ice cream', 'marshmallow'],
    crossContamination: ['baked goods', 'breakfast items', 'desserts'],
    severity: 'moderate'
  },
  
  // Soy - increasingly common
  soy: {
    obvious: ['soy', 'tofu', 'soy sauce', 'miso', 'tempeh', 'edamame'],
    hidden: ['lecithin', 'hydrolyzed vegetable protein', 'asian cuisine', 'vegetable oil', 'tamari'],
    crossContamination: ['processed foods', 'asian restaurants'],
    severity: 'moderate'
  }
};

// Risk scoring based on dataset insights
const ALLERGY_RISK_SCORES = {
  critical: 5,  // Nuts, shellfish - life-threatening
  high: 4,      // Dairy, seafood - severe symptoms
  moderate: 3,  // Eggs, gluten, soy - moderate symptoms
  low: 2,       // Mild reactions
  trace: 1      // Cross-contamination only
};

// Helper functions  
const hasWord = (hay, w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(hay);
const anyWord = (hay, words) => words.some(w => hasWord(hay, w));

function detectAllergens(recipe) {
  const text = `${(recipe.title || '').toLowerCase()} ${(recipe.ingredients || []).join(' ').toLowerCase()} ${recipe.instructions.toLowerCase()}`;
  
  const allergenResults = {};
  const riskFactors = [];
  
  Object.entries(ENHANCED_ALLERGEN_MAP).forEach(([allergen, data]) => {
    let detected = false;
    let riskLevel = 'none';
    let sources = [];
    
    // Check obvious allergens
    if (anyWord(text, data.obvious)) {
      detected = true;
      riskLevel = data.severity;
      sources.push('obvious');
    }
    
    // Check hidden allergens
    if (anyWord(text, data.hidden)) {
      detected = true;
      if (riskLevel === 'none') riskLevel = data.severity;
      sources.push('hidden');
    }
    
    // Check cross-contamination risk
    if (anyWord(text, data.crossContamination)) {
      if (!detected) {
        detected = true;
        riskLevel = 'trace';
        sources.push('cross-contamination');
      }
    }
    
    if (detected) {
      allergenResults[allergen] = {
        present: true,
        riskLevel,
        sources,
        score: ALLERGY_RISK_SCORES[riskLevel] || 1
      };
    }
  });
  
  return allergenResults;
}

function generateAllergenTags(allergenResults) {
  const tags = [];
  const allergenFree = [];
  
  // Add allergen-present tags
  Object.entries(allergenResults).forEach(([allergen, data]) => {
    if (data.present && data.riskLevel !== 'trace') {
      tags.push(`contains_${allergen}`);
      
      // Add severity tags for critical allergens
      if (data.riskLevel === 'critical') {
        tags.push('high_allergy_risk');
      }
    }
  });
  
  // Generate allergen-free tags for non-detected allergens
  Object.keys(ENHANCED_ALLERGEN_MAP).forEach(allergen => {
    if (!allergenResults[allergen] || allergenResults[allergen].riskLevel === 'none') {
      allergenFree.push(`${allergen}_free`);
    }
  });
  
  return [...tags, ...allergenFree];
}

async function scanAllRecipes() {
  console.log("🔍 Scanning all recipes for enhanced allergy detection...");
  
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

async function updateRecipeAllergens(recipeId, newHabits, newHabitsCSV, allergenData) {
  const params = {
    TableName: TABLE,
    Key: { recipe_id: recipeId },
    UpdateExpression: "SET habits = :habits, habits_csv = :habits_csv, allergen_analysis = :allergen_data",
    ExpressionAttributeValues: {
      ":habits": newHabits,
      ":habits_csv": newHabitsCSV,
      ":allergen_data": allergenData
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
  console.log("🚨 Enhanced Allergy Detection System");
  console.log("===================================\n");
  
  // Scan all existing recipes
  const recipes = await scanAllRecipes();
  
  if (recipes.length === 0) {
    console.log("❌ No recipes found in database");
    return;
  }
  
  console.log("\n🔍 Analyzing recipes for enhanced allergen detection...");
  
  const updates = [];
  const allergenStats = {};
  const riskDistribution = {};
  
  recipes.forEach((recipe, index) => {
    if (index % 100 === 0) {
      console.log(`   Analyzed ${index}/${recipes.length} recipes...`);
    }
    
    const allergenResults = detectAllergens(recipe);
    const allergenTags = generateAllergenTags(allergenResults);
    
    // Combine with existing habits
    const currentHabits = new Set(recipe.habits || []);
    const newHabits = [...currentHabits];
    
    // Add new allergen tags
    allergenTags.forEach(tag => {
      if (!currentHabits.has(tag)) {
        newHabits.push(tag);
      }
    });
    
    // Statistics
    Object.entries(allergenResults).forEach(([allergen, data]) => {
      if (!allergenStats[allergen]) allergenStats[allergen] = { total: 0, byRisk: {} };
      allergenStats[allergen].total++;
      allergenStats[allergen].byRisk[data.riskLevel] = (allergenStats[allergen].byRisk[data.riskLevel] || 0) + 1;
      
      riskDistribution[data.riskLevel] = (riskDistribution[data.riskLevel] || 0) + 1;
    });
    
    // Queue for update if changes detected
    if (newHabits.length > currentHabits.size || Object.keys(allergenResults).length > 0) {
      updates.push({
        recipe_id: recipe.recipe_id,
        title: recipe.title,
        allergenResults,
        newHabits: newHabits.sort(),
        addedTags: newHabits.filter(h => !currentHabits.has(h))
      });
    }
  });
  
  console.log(`\n📈 Enhanced allergen analysis complete!`);
  console.log(`🔄 ${updates.length} recipes need allergen updates\n`);
  
  // Show allergen statistics
  console.log("🚨 Allergen Detection Statistics:");
  Object.entries(allergenStats)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([allergen, stats]) => {
      console.log(`  ${allergen}: ${stats.total} recipes`);
      Object.entries(stats.byRisk).forEach(([risk, count]) => {
        console.log(`    ${risk}: ${count} recipes`);
      });
    });
  
  console.log("\n⚠️ Risk Level Distribution:");
  Object.entries(riskDistribution)
    .sort((a, b) => (ALLERGY_RISK_SCORES[b[0]] || 0) - (ALLERGY_RISK_SCORES[a[0]] || 0))
    .forEach(([risk, count]) => {
      console.log(`  ${risk}: ${count} detections`);
    });
  
  // Show first 10 examples
  console.log("\n📋 First 10 recipes with enhanced allergen detection:");
  updates.slice(0, 10).forEach((update, i) => {
    console.log(`${i+1}. ${update.title}`);
    console.log(`   Detected: ${Object.keys(update.allergenResults).join(', ')}`);
    console.log(`   New tags: ${update.addedTags.join(', ')}`);
    console.log('');
  });
  
  if (updates.length === 0) {
    console.log("✅ All recipes already have enhanced allergen detection!");
    return;
  }
  
  // Perform updates
  console.log(`\n🚀 Updating ${updates.length} recipes with enhanced allergen data...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    const success = await updateRecipeAllergens(
      update.recipe_id, 
      update.newHabits, 
      update.newHabits.join(','),
      update.allergenResults
    );
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    if ((i + 1) % 50 === 0) {
      console.log(`   Updated ${i + 1}/${updates.length} recipes`);
    }
  }
  
  console.log("\n🎉 ENHANCED ALLERGY DETECTION COMPLETE!");
  console.log("==========================================");
  console.log(`✅ Successfully updated: ${successCount} recipes`);
  console.log(`❌ Failed updates: ${failCount} recipes`);
  console.log(`📊 Total allergen detections: ${Object.values(riskDistribution).reduce((a, b) => a + b, 0)}`);
  
  console.log("\n🔍 System now supports:");
  console.log("• Hidden allergen detection (soy sauce → gluten)");
  console.log("• Cross-contamination risk assessment");
  console.log("• Severity-based risk scoring");
  console.log("• Enhanced allergen-free tagging");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});