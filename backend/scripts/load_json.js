import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGION = "ap-southeast-2";
const TABLE = "Recipes_i2";

const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

// Logging setup
const logFile = path.join(__dirname, "load_json_output.log");
const logStream = fs.createWriteStream(logFile, { flags: 'w' });

function log(message) {
  console.log(message);
  logStream.write(message + '\n');
}

// Convert recipe from recipes_processed.json format to DynamoDB format
function convertRecipe(recipe, index) {
  // Extract habits from boolean fields
  const habits = [];
  const booleanToHabit = {
    "Vegetarian": "vegetarian",
    "Vegan": "vegan",
    "Dairy Free": "dairy_free",
    "Gluten Free": "gluten_free",
    "Nut Free": "nut_free",
    "Soy Free": "soy_free",
    "Sugar Conscious": "low_sugar",
    "Keto": "keto",
    "Healthyish": "healthyish",
    "Kid-Friendly": "kid_friendly",
    "Pescatarian": "pescatarian",
    "Kosher": "kosher",
    "Raw": "raw"
  };

  Object.entries(booleanToHabit).forEach(([field, habit]) => {
    if (recipe[field] === 1) habits.push(habit);
  });

  // Add new lowercase allergy fields
  if (recipe.egg_free === 1) habits.push("egg_free");
  if (recipe.fish_free === 1) habits.push("fish_free");
  if (recipe.shellfish_free === 1) habits.push("shellfish_free");

  // Add low_sodium if not high_salt
  if (recipe.high_salt === 0) habits.push("low_sodium");

  // Extract categories from meal type booleans
  const categories = [];
  const mealTypes = ["Breakfast", "Lunch", "Dinner", "Brunch", "Snack", "Side", "Starter", "Main"];
  mealTypes.forEach(meal => {
    if (recipe[meal] === 1) categories.push(meal.toLowerCase());
  });

  // Default to dinner if no category
  if (categories.length === 0) categories.push("dinner");

  return {
    recipe_id: `json_${String(index).padStart(4, '0')}`,
    title: recipe.title,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,

    // Categories and habits (new format)
    categories: categories,
    categories_csv: categories.join(','),
    habits: habits,
    habits_csv: habits.join(','),

    // Keep original tags structure
    tags: recipe.tags,

    // Basic metadata
    rating: recipe.ratings?.rating || 4.0,
    rating_count: recipe.ratings?.count || 1,
    servings: recipe.servings || 4,
    cooking_time: recipe.cooking_time,
    description: recipe.description || '',
    difficulty: recipe.difficulty || "Medium",

    // Image handling
    has_image: !!recipe.image_filename,
    image_display: recipe.image_filename ?
      `https://tp33-data-recipe.s3.ap-southeast-2.amazonaws.com/raw/foodspics/${recipe.image_filename}.jpg` : null,
    image_name: recipe.image_filename,

    // System fields
    created_at: new Date().toISOString(),
    source: "recipes_processed_json",

    // Additional fields from original data
    publish_date: recipe.publish_date,
    num_steps: recipe.num_steps,
    spicy: recipe.spicy,
    high_salt: recipe.high_salt,

    // Keep all original boolean fields for reference
    original_boolean_fields: {
      "Main": recipe.Main,
      "Brunch": recipe.Brunch,
      "Dinner": recipe.Dinner,
      "Starter": recipe.Starter,
      "Breakfast": recipe.Breakfast,
      "Lunch": recipe.Lunch,
      "Snack": recipe.Snack,
      "Side": recipe.Side,
      "Pescatarian": recipe.Pescatarian,
      "Raw": recipe.Raw,
      "Healthyish": recipe.Healthyish,
      "Kid-Friendly": recipe["Kid-Friendly"],
      "Keto": recipe.Keto,
      "Quick & Easy": recipe["Quick & Easy"],
      "Nut Free": recipe["Nut Free"],
      "Vegetarian": recipe.Vegetarian,
      "Vegan": recipe.Vegan,
      "Gluten Free": recipe["Gluten Free"],
      "Sugar Conscious": recipe["Sugar Conscious"],
      "Kosher": recipe.Kosher,
      "Soy Free": recipe["Soy Free"],
      "Dairy Free": recipe["Dairy Free"],
      // New lowercase allergy fields
      "egg_free": recipe.egg_free,
      "fish_free": recipe.fish_free,
      "shellfish_free": recipe.shellfish_free
    }
  };
}

// load and upload function
async function main() {
  const startTime = new Date();
  log("🥗 Loading recipes_processed.json to DynamoDB");
  log(`⏰ Started at: ${startTime.toISOString()}`);
  log("═══════════════════════════════════════════\n");

  // Read recipes_processed.json
  log("📖 Reading recipes_processed.json...");
  try {
    const rawData = fs.readFileSync(path.join(__dirname, "recipes_processed.json"), 'utf8');
    const recipes = JSON.parse(rawData);

    log(`📊 Found ${recipes.length.toLocaleString()} recipes to upload\n`);

    // Convert all recipes
    log("🔄 Converting recipes to DynamoDB format...");
    const convertedRecipes = recipes.map((recipe, index) => convertRecipe(recipe, index));

    // Quick statistics
    const totalHabits = convertedRecipes.reduce((sum, r) => sum + r.habits.length, 0);
    const totalCategories = convertedRecipes.reduce((sum, r) => sum + r.categories.length, 0);
    const withImages = convertedRecipes.filter(r => r.has_image).length;

    log(`✅ Successfully converted ${convertedRecipes.length} recipes`);
    log(`📊 Average habits per recipe: ${(totalHabits / convertedRecipes.length).toFixed(1)}`);
    log(`📊 Average categories per recipe: ${(totalCategories / convertedRecipes.length).toFixed(1)}`);
    log(`🖼️ Recipes with images: ${withImages}/${convertedRecipes.length} (${((withImages / convertedRecipes.length) * 100).toFixed(1)}%)\n`);

    // Upload to DynamoDB
    log("🚀 Starting DynamoDB upload...");
    const batchSize = 25;
    let uploaded = 0;
    let errors = 0;

    for (let i = 0; i < convertedRecipes.length; i += batchSize) {
      const batch = convertedRecipes.slice(i, i + batchSize);

      try {
        const params = {
          RequestItems: {
            [TABLE]: batch.map(item => ({
              PutRequest: { Item: item }
            }))
          }
        };

        await ddb.send(new BatchWriteCommand(params));
        uploaded += batch.length;

        // Progress update every 250 recipes or at completion
        if (uploaded % 250 === 0 || uploaded === convertedRecipes.length) {
          const percentage = ((uploaded / convertedRecipes.length) * 100).toFixed(1);
          log(`   📤 Uploaded ${uploaded}/${convertedRecipes.length} recipes (${percentage}%)`);
        }

        // Rate limiting - small delay between batches
        if (i + batchSize < convertedRecipes.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        errors++;
        const errorMsg = `❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`;
        console.error(errorMsg);
        logStream.write(errorMsg + '\n');

        // Log sample of failed items for first few errors
        if (errors <= 3) {
          log(`   Sample failed item: ${batch[0]?.recipe_id} - ${batch[0]?.title}`);
        }
      }
    }

    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);

    log("\n🎉 UPLOAD COMPLETE!");
    log("==================");
    log(`✅ Successfully uploaded: ${uploaded}/${convertedRecipes.length} recipes`);
    log(`❌ Failed batches: ${errors}`);
    log(`📊 Success rate: ${((uploaded / convertedRecipes.length) * 100).toFixed(1)}%`);
    log(`🏢 Database: ${TABLE}`);
    log(`📍 Region: ${REGION}`);
    log(`⏰ Completed at: ${endTime.toISOString()}`);
    log(`⌛ Duration: ${duration} seconds`);
    log(`🚀 Average speed: ${Math.round(uploaded / duration)} recipes/second`);

    // Show category and habit distribution
    const categoryStats = {};
    const habitStats = {};

    convertedRecipes.forEach(recipe => {
      recipe.categories.forEach(cat => {
        categoryStats[cat] = (categoryStats[cat] || 0) + 1;
      });
      recipe.habits.forEach(habit => {
        habitStats[habit] = (habitStats[habit] || 0) + 1;
      });
    });

    log("\n📊 CATEGORY DISTRIBUTION:");
    Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        const percentage = ((count / convertedRecipes.length) * 100).toFixed(1);
        log(`   📋 ${category}: ${count} recipes (${percentage}%)`);
      });

    log("\n🏷️ TOP HABIT TAGS:");
    Object.entries(habitStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([habit, count]) => {
        const percentage = ((count / convertedRecipes.length) * 100).toFixed(1);
        log(`   🏷️ ${habit}: ${count} recipes (${percentage}%)`);
      });

    logStream.end();

    if (errors > 0) {
      console.warn(`\n⚠️ Warning: ${errors} batches failed. Check ${logFile} for details.`);
      process.exit(1);
    }

  } catch (error) {
    if (error.code === 'ENOENT') {
      log("❌ Error: recipes_processed.json file not found!");
      log("   Make sure the file exists in the scripts directory.");
    } else {
      log(`❌ Error reading recipes_processed.json: ${error.message}`);
    }
    logStream.end();
    process.exit(1);
  }
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