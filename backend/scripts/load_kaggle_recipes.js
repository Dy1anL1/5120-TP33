import fs from "fs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import csv from "csv-parser";
import { v4 as uuidv4 } from "uuid";

const REGION = "ap-southeast-2";
const TABLE = "Recipes_i2";
const TARGET_RECIPES = 1000; // 先加载1000个测试

const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

// --- 工具函数 ---
const W = (s) => (s || '').toLowerCase().trim();
const hasWord = (hay, w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(hay);
const anyWord = (hay, words) => words.some(w => hasWord(hay, w));
const notAnyWord = (hay, words) => !anyWord(hay, words);

// 解析JSON数组或返回空数组
function parseArray(str) {
  if (Array.isArray(str)) return str.map(String);
  if (!str || typeof str !== 'string') return [];
  
  try {
    const parsed = JSON.parse(str.replace(/'/g, '"')); // 处理单引号
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    return str.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
  }
}

// --- 老年人友好评分系统 ---
function getSeniorFriendlyScore(title, ingredients, instructions) {
  let score = 50; // 基础分
  const text = `${title} ${ingredients.join(' ')} ${instructions}`.toLowerCase();
  
  // 烹饪方法评分
  const excellentMethods = ['steamed', 'boiled', 'stewed', 'braised', 'slow cook', 'simmer', 'poach'];
  const goodMethods = ['baked', 'roasted', 'grilled', 'sautéed', 'mashed'];
  const badMethods = ['deep-fried', 'fried', 'very spicy', 'ghost pepper', 'habanero'];
  
  excellentMethods.forEach(method => {
    if (hasWord(text, method)) score += 5;
  });
  goodMethods.forEach(method => {
    if (hasWord(text, method)) score += 2;
  });
  badMethods.forEach(method => {
    if (hasWord(text, method)) score -= 4;
  });
  
  // 健康关键词
  if (hasWord(text, 'healthy') || hasWord(text, 'nutritious')) score += 3;
  if (hasWord(text, 'low sodium') || hasWord(text, 'low salt')) score += 4;
  if (hasWord(text, 'diabetic') || hasWord(text, 'sugar free')) score += 3;
  if (hasWord(text, 'soft') || hasWord(text, 'tender')) score += 4;
  if (hasWord(text, 'easy') || hasWord(text, 'simple')) score += 2;
  
  // 营养价值
  const nutrients = ['protein', 'vitamin', 'calcium', 'fiber', 'omega', 'antioxidant'];
  nutrients.forEach(nutrient => {
    if (hasWord(text, nutrient)) score += 2;
  });
  
  // 复杂度惩罚
  if (ingredients.length > 20) score -= 3;
  if (instructions.length > 2000) score -= 2;
  
  return Math.max(0, Math.min(100, score));
}

// --- 智能分类识别 ---
function getCategory(title, ingredients, instructions) {
  const text = `${W(title)} ${ingredients.join(' ').toLowerCase()} ${W(instructions)}`;
  const titleLower = W(title);
  
  // 严格匹配关键词
  if (anyWord(titleLower, ['breakfast']) || 
      anyWord(text, ['pancake', 'waffle', 'oatmeal', 'cereal', 'toast', 'eggs benedict', 'morning'])) {
    return 'breakfast';
  }
  
  if (anyWord(titleLower, ['soup', 'broth', 'stew', 'chowder', 'bisque']) ||
      anyWord(text, ['soup bowl', 'broth base', 'soup pot'])) {
    return 'soup';
  }
  
  if (anyWord(titleLower, ['salad']) && 
      anyWord(text, ['lettuce', 'greens', 'spinach', 'arugula', 'dressing', 'vinaigrette'])) {
    return 'salad';
  }
  
  if (anyWord(titleLower, ['cake', 'pie', 'cookie', 'dessert', 'pudding', 'ice cream', 'tart']) ||
      anyWord(text, ['frosting', 'icing', 'sweet', 'chocolate', 'sugar', 'vanilla extract'])) {
    return 'dessert';
  }
  
  if (anyWord(titleLower, ['smoothie', 'juice', 'drink', 'cocktail', 'latte', 'tea']) ||
      anyWord(text, ['blend until smooth', 'serve chilled', 'garnish with'])) {
    return 'drink';
  }
  
  if (anyWord(titleLower, ['snack', 'appetizer', 'dip', 'chips']) ||
      anyWord(text, ['serve with crackers', 'finger food', 'party snack'])) {
    return 'snack';
  }
  
  if (anyWord(titleLower, ['sandwich', 'wrap', 'burger']) ||
      anyWord(text, ['lunch special', 'light meal', 'quick lunch'])) {
    return 'lunch';
  }
  
  return 'dinner'; // 默认
}

// --- Diet Type 和过敏原检测 ---
function getDietHabits(title, ingredients, instructions) {
  const text = `${W(title)} ${ingredients.join(' ').toLowerCase()} ${W(instructions)}`;
  const tags = [];
  
  // 肉类检测
  const meat = ['beef', 'pork', 'bacon', 'ham', 'lamb', 'sausage', 'pepperoni'];
  const poultry = ['chicken', 'turkey', 'duck', 'goose'];
  const seafood = ['fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'scallop'];
  const dairy = ['milk', 'butter', 'cheese', 'cream', 'yogurt', 'sour cream'];
  const eggs = ['egg', 'eggs', 'mayonnaise'];
  
  const hasMeat = anyWord(text, meat);
  const hasPoultry = anyWord(text, poultry);
  const hasSeafood = anyWord(text, seafood);
  const hasDairy = anyWord(text, dairy);
  const hasEggs = anyWord(text, eggs);
  
  // 素食检测
  if (!hasMeat && !hasPoultry && !hasSeafood) {
    tags.push('vegetarian');
    if (!hasDairy && !hasEggs && !hasWord(text, 'honey')) {
      tags.push('vegan');
    }
  }
  
  // 健康标签
  if (hasWord(text, 'low sugar') || hasWord(text, 'sugar free')) tags.push('low_sugar');
  if (hasWord(text, 'low sodium') || hasWord(text, 'low salt')) tags.push('low_sodium');
  if (hasWord(text, 'heart healthy') || hasWord(text, 'low fat')) tags.push('heart_healthy');
  if (hasWord(text, 'diabetic') || hasWord(text, 'diabetes')) tags.push('diabetic_friendly');
  if (hasWord(text, 'soft') || hasWord(text, 'tender')) tags.push('soft_food');
  
  // 过敏原检测
  const gluten = ['wheat', 'flour', 'bread', 'pasta', 'noodle', 'barley', 'rye'];
  const nuts = ['peanut', 'almond', 'walnut', 'cashew', 'hazelnut', 'pecan'];
  const shellfish = ['shrimp', 'crab', 'lobster', 'oyster', 'clam'];
  const soy = ['soy', 'tofu', 'tempeh', 'miso', 'soy sauce'];
  const fish = ['fish', 'salmon', 'tuna', 'cod', 'bass'];
  
  if (notAnyWord(text, dairy)) tags.push('dairy_free');
  if (notAnyWord(text, gluten)) tags.push('gluten_free');
  if (notAnyWord(text, nuts)) tags.push('nut_free');
  if (notAnyWord(text, shellfish)) tags.push('shellfish_free');
  if (notAnyWord(text, eggs)) tags.push('egg_free');
  if (notAnyWord(text, soy)) tags.push('soy_free');
  if (notAnyWord(text, fish)) tags.push('fish_free');
  
  return tags;
}

// --- 批量写入 ---
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

// --- 主函数 ---
async function main() {
  console.log("🍳 Loading Kaggle Recipe Dataset to Recipes_i2");
  console.log(`📊 Processing ~13.5K recipes, selecting top ${TARGET_RECIPES} for seniors\\n`);
  
  const allRecipes = [];
  let processed = 0;
  
  console.log("📖 Reading and processing recipes...");
  
  await new Promise((resolve, reject) => {
    fs.createReadStream("Food Ingredients and Recipe Dataset with Image Name Mapping.csv")
      .pipe(csv())
      .on("data", (row) => {
        processed++;
        if (processed % 10000 === 0) {
          console.log(`   Processed ${processed.toLocaleString()} rows...`);
        }
        
        if (!row.Title || !row.Ingredients) return;
        
        const title = (row.Title || '').trim();
        const ingredients = parseArray(row.Ingredients);
        const instructions = (row.Instructions || '').trim();
        const imageName = (row.Image_Name || '').trim();
        const cleanedIngredients = parseArray(row.Cleaned_Ingredients);
        
        if (title.length < 3 || ingredients.length < 2) return;
        
        const score = getSeniorFriendlyScore(title, ingredients, instructions);
        
        allRecipes.push({
          title,
          ingredients,
          instructions,
          imageName,
          cleanedIngredients,
          score
        });
      })
      .on("end", () => {
        console.log(`📊 Found ${allRecipes.length.toLocaleString()} valid recipes from ${processed.toLocaleString()} total`);
        resolve();
      })
      .on("error", reject);
  });
  
  // 按评分排序并选择前N个
  console.log("🎯 Sorting by senior-friendliness and selecting top recipes...");
  allRecipes.sort((a, b) => b.score - a.score);
  const selectedRecipes = allRecipes.slice(0, TARGET_RECIPES);
  
  console.log("🏷️ Generating categories and tags...");
  const finalItems = [];
  const categoryStats = {};
  const tagStats = {};
  
  selectedRecipes.forEach((recipe, index) => {
    const category = getCategory(recipe.title, recipe.ingredients, recipe.instructions);
    const habits = getDietHabits(recipe.title, recipe.ingredients, recipe.instructions);
    
    categoryStats[category] = (categoryStats[category] || 0) + 1;
    habits.forEach(tag => {
      tagStats[tag] = (tagStats[tag] || 0) + 1;
    });
    
    const title_lc = recipe.title.toLowerCase();
    const recipeId = `kaggle_${String(index + 1).padStart(4, '0')}`;
    
    const item = {
      recipe_id: recipeId,
      title: recipe.title,
      title_lc,
      title_lc_first1: title_lc[0] || 'a',
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      cleaned_ingredients: recipe.cleanedIngredients,
      
      // 图片相关
      image_name: recipe.imageName,
      image_url: null, // 预留
      has_image: !!recipe.imageName,
      
      // 分类
      categories: [category],
      habits,
      categories_csv: category,
      habits_csv: habits.join(','),
      
      // 搜索
      ingredients_text: recipe.ingredients.join(' ').toLowerCase().slice(0, 4000),
      senior_score: recipe.score,
      
      // 元数据
      source: 'Kaggle',
      created_at: new Date().toISOString()
    };
    
    finalItems.push(item);
  });
  
  // 统计信息
  console.log("\\n📈 FINAL STATISTICS:");
  console.log("═══════════════════════════════════");
  console.log(`Total recipes: ${finalItems.length}`);
  
  console.log("\\n📊 CATEGORY DISTRIBUTION:");
  Object.entries(categoryStats).forEach(([category, count]) => {
    const percentage = ((count / finalItems.length) * 100).toFixed(1);
    console.log(`  ✅ ${category}: ${count} recipes (${percentage}%)`);
  });
  
  console.log("\\n🏷️ TOP DIET TAGS:");
  Object.entries(tagStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([tag, count]) => {
      console.log(`  ✅ ${tag}: ${count} recipes`);
    });
  
  // 写入数据库
  await batchWriteAll(finalItems, TABLE);
  
  console.log("\\n🎉 SUCCESS! Kaggle recipes loaded to Recipes_i2!");
  console.log("═══════════════════════════════════");
  console.log(`📸 Recipes with images: ${finalItems.filter(r => r.has_image).length}`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});