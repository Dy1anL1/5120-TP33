// recipes-api entry point
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const TABLE = process.env.RECIPES_TABLE || 'Recipes_i2';
const GSI_TITLE_PREFIX = 'gsi_title_prefix';

const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

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

    // Handle additional string fields
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

    // Ensure directions is properly formatted (already converted from instructions above)
    if (item.directions && Array.isArray(item.directions)) {
      item.directions = item.directions.map(dir => String(dir));
    }
  
  // Use stored tags if available, otherwise generate them
  if (!item.habits || !item.categories) {
    // Parse stored tags from CSV strings if they exist
    if (item.habits_csv) {
      item.habits = item.habits_csv.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      item.habits = getHabits(item);
    }
    
    if (item.categories_csv) {
      item.categories = item.categories_csv.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      item.categories = getCategories(item);
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

// --- tagging utils ---
function textBag(recipe) {
  if (!recipe || typeof recipe !== 'object') {
    console.warn('textBag: received null or invalid recipe');
    return '';
  }

  const parts = [];
  try {
    if (recipe.title) parts.push(String(recipe.title));
    if (Array.isArray(recipe.ingredients)) {
      parts.push(...recipe.ingredients.filter(i => i != null).map(String));
    }
    const ner = Array.isArray(recipe.NER) ? recipe.NER : Array.isArray(recipe.ner) ? recipe.ner : [];
    parts.push(...ner.filter(n => n != null).map(String));
    return parts.join(" ").toLowerCase();
  } catch (error) {
    console.error('Error in textBag:', error.message);
    return '';
  }
}
function hasAny(txt, words) { return words.some(w => txt.includes(w)); }

function getHabits(recipe) {
  if (!recipe) return [];
  const txt = textBag(recipe);
  const MEAT   = ["meat","chicken","beef","pork","bacon","lamb","ham","turkey","fish","tuna","salmon","shrimp","anchovy","gelatin"];
  const DAIRY  = ["milk","cheese","butter","cream","yogurt","whey","ghee"];
  const EGGS   = ["egg","eggs","albumen","mayonnaise"];
  const GLUTEN = ["wheat","flour","bread","pasta","noodle","semolina","barley","rye","cracker","beer"];
  const NUTS   = ["peanut","almond","walnut","pecan","cashew","hazelnut","pistachio","macadamia"];
  const SUGAR  = ["sugar","syrup","honey","molasses","fructose","glucose","corn syrup"];

  const tags = new Set();
  const hasMeat = hasAny(txt, MEAT);
  const hasDairy = hasAny(txt, DAIRY);
  const hasEggs = hasAny(txt, EGGS);
  const hasGluten = hasAny(txt, GLUTEN);
  const hasNuts = hasAny(txt, NUTS);
  const hasSugar = hasAny(txt, SUGAR);

  if (!hasMeat) {
    tags.add("vegetarian");
    if (!hasDairy && !hasEggs && !txt.includes("honey")) tags.add("vegan");
  }
  if (!hasDairy) tags.add("dairy_free");
  if (!hasGluten) tags.add("gluten_free");
  if (!hasNuts) tags.add("nut_free");
  if (!hasSugar) tags.add("low_sugar");

  return Array.from(tags);
}

function getCategories(recipe) {
  if (!recipe) return [];
  const txt = textBag(recipe);
  const cat = new Set();

  if (hasAny(txt, ["cake","cookie","brownie","pie","pudding","mousse","tart","frosting"])) cat.add("dessert");
  if (hasAny(txt, ["soup","broth","chowder","bisque"])) cat.add("soup");
  if (hasAny(txt, ["salad"])) cat.add("salad");
  if (hasAny(txt, ["smoothie","juice","latte","milkshake","punch","lemonade","drink"])) cat.add("drink");
  if (hasAny(txt, ["pancake","waffle","oatmeal","cereal","muffin","granola","omelet","breakfast","toast","bagel","eggs","brunch"])) cat.add("breakfast");
  if (hasAny(txt, ["dip","nacho","popcorn","bar"])) cat.add("snack");

  if (hasAny(txt, ["casserole","stew","roast","pasta","rice","noodle","chicken","beef","pork","fish"])) {
    cat.add("lunch"); cat.add("dinner");
  }
  if (cat.size === 0) cat.add("dinner");
  return Array.from(cat);
}

exports.handler = async (event) => {
  const headers = { 
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token',
    'Content-Type': 'application/json'
  };
  
  // Handle OPTIONS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  try {
    const params = event.queryStringParameters || {};
    const { recipe_id, title_prefix, limit, next_token, habit, category, diet_type, allergy_filter } = params;
    if (recipe_id) {
      const cmd = new GetCommand({ TableName: TABLE, Key: { recipe_id } });
      const { Item } = await ddb.send(cmd);
      if (!Item) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
      return { statusCode: 200, headers, body: JSON.stringify(normalizeRecipe(Item)) };
    }
    if (title_prefix) {
      // Use scan with filter since GSI fields are not populated
      const prefix = title_prefix.trim().toLowerCase();
      if (!prefix) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'title_prefix required' }) };
      }

      let items = [];
      let scanned = 0;
      let lastKey = undefined;
      if (next_token) {
        try {
          lastKey = JSON.parse(Buffer.from(next_token, 'base64').toString());
        } catch (e) {
          console.warn('Invalid next_token, ignoring:', e.message);
        }
      }
      const pageLimit = 100;
      const resultLimit = limit ? Number(limit) : 10;
      let nextTokenResult = undefined;

      while (items.length < resultLimit && scanned < 5000) {
        const scanParams = {
          TableName: TABLE,
          Limit: pageLimit,
          ExclusiveStartKey: lastKey,
        };

        const data = await ddb.send(new ScanCommand(scanParams));
        let pageItems = (data.Items || [])
          .map(normalizeRecipe)
          .filter(r => r !== null && r.title && r.title.toLowerCase().includes(prefix));

        // Apply additional filters
        if (habit) pageItems = pageItems.filter(r => r && Array.isArray(r.habits) && r.habits.includes(habit));
        if (category) pageItems = pageItems.filter(r => r && Array.isArray(r.categories) && r.categories.includes(category));
        if (diet_type && diet_type !== 'all') pageItems = pageItems.filter(r => r && Array.isArray(r.habits) && r.habits.includes(diet_type));
        if (allergy_filter && allergy_filter !== 'all') pageItems = pageItems.filter(r => r && Array.isArray(r.habits) && r.habits.includes(allergy_filter));

        items = items.concat(pageItems);
        scanned += (data.Items || []).length;
        if (!data.LastEvaluatedKey) break;
        lastKey = data.LastEvaluatedKey;
        nextTokenResult = Buffer.from(JSON.stringify(lastKey)).toString('base64');
      }

      if (items.length >= resultLimit && nextTokenResult) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ items: items.slice(0, resultLimit), count: resultLimit, next_token: nextTokenResult })
        };
      } else {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ items, count: items.length, next_token: null })
        };
      }
    }
    // Only category/habit filtering, scan table if no title_prefix
    if (category || habit || diet_type || allergy_filter) {
      // Scan multiple pages until enough results collected
      let items = [];
      let scanned = 0;
      let lastKey = undefined;
      if (next_token) {
        try {
          lastKey = JSON.parse(Buffer.from(next_token, 'base64').toString());
        } catch (e) {
          console.warn('Invalid next_token, ignoring:', e.message);
        }
      }
      const pageLimit = 100; // scan max items per page
      const resultLimit = limit ? Number(limit) : 10;
      let nextToken = undefined;
      while (items.length < resultLimit && scanned < 10000) { // Scan up to 10,000 items to prevent infinite loop
        const scanParams = {
          TableName: TABLE,
          Limit: pageLimit,
          ExclusiveStartKey: lastKey,
        };
        const data = await ddb.send(new ScanCommand(scanParams));
        let pageItems = (data.Items || []).map(normalizeRecipe);
        if (habit)    pageItems = pageItems.filter(r => Array.isArray(r.habits) && r.habits.includes(habit));
        if (category) pageItems = pageItems.filter(r => Array.isArray(r.categories) && r.categories.includes(category));
        if (diet_type && diet_type !== 'all') pageItems = pageItems.filter(r => Array.isArray(r.habits) && r.habits.includes(diet_type));
        if (allergy_filter && allergy_filter !== 'all') pageItems = pageItems.filter(r => Array.isArray(r.habits) && r.habits.includes(allergy_filter));
        items = items.concat(pageItems);
        scanned += (data.Items || []).length;
        if (!data.LastEvaluatedKey) break;
        lastKey = data.LastEvaluatedKey;
        nextToken = Buffer.from(JSON.stringify(lastKey)).toString('base64');
      }
      // Only return next_token if limit is reached and there is more data
      if (items.length >= resultLimit && nextToken) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ items: items.slice(0, resultLimit), count: resultLimit, next_token: nextToken })
        };
      } else {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ items, count: items.length, next_token: null })
        };
      }
    }
    
    // Handle filter-only requests (no recipe_id or title_prefix)
    if (category || habit || diet_type || allergy_filter || (!recipe_id && !title_prefix)) {
      // General scan with filters
      let items = [];
      let scanned = 0;
      let lastKey = null;
      if (next_token) {
        try {
          lastKey = JSON.parse(Buffer.from(next_token, 'base64').toString());
        } catch (e) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid next_token' }) };
        }
      }
      const pageLimit = 100;
      const resultLimit = limit ? Number(limit) : 10;
      let nextTokenResult = undefined;
      
      while (items.length < resultLimit && scanned < 10000) {
        const scanParams = {
          TableName: TABLE,
          Limit: pageLimit,
          ExclusiveStartKey: lastKey,
        };
        const data = await ddb.send(new ScanCommand(scanParams));
        let pageItems = (data.Items || [])
          .map(normalizeRecipe)
          .filter(r => r !== null); // Remove null items from normalization errors
        
        // Apply filters
        if (habit) pageItems = pageItems.filter(r => r && Array.isArray(r.habits) && r.habits.includes(habit));
        if (category) pageItems = pageItems.filter(r => r && Array.isArray(r.categories) && r.categories.includes(category));
        if (diet_type && diet_type !== 'all') pageItems = pageItems.filter(r => r && Array.isArray(r.habits) && r.habits.includes(diet_type));
        if (allergy_filter && allergy_filter !== 'all') pageItems = pageItems.filter(r => r && Array.isArray(r.habits) && r.habits.includes(allergy_filter));
        
        items = items.concat(pageItems);
        scanned += (data.Items || []).length;
        if (!data.LastEvaluatedKey) break;
        lastKey = data.LastEvaluatedKey;
        nextTokenResult = Buffer.from(JSON.stringify(lastKey)).toString('base64');
      }
      
      if (items.length >= resultLimit && nextTokenResult) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ items: items.slice(0, resultLimit), count: resultLimit, next_token: nextTokenResult })
        };
      } else {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ items, count: items.length, next_token: null })
        };
      }
    }
    
    // If no specific parameters, return a basic scan with small limit
    const scanParams = {
      TableName: TABLE,
      Limit: limit ? Math.min(Number(limit), 50) : 10, // Cap at 50 to prevent timeout
    };
    const data = await ddb.send(new ScanCommand(scanParams));
    const items = (data.Items || [])
      .map(normalizeRecipe)
      .filter(r => r !== null);

    const nextToken = data.LastEvaluatedKey ? Buffer.from(JSON.stringify(data.LastEvaluatedKey)).toString('base64') : undefined;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ items, count: items.length, next_token: nextToken })
    };
  } catch (e) {
    console.error('API Error:', e.message);
    console.error('Stack trace:', e.stack);
    console.error('Event data:', JSON.stringify(event, null, 2));
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message, type: e.constructor.name }) };
  }
};
