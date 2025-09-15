// recipes-api entry point
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const TABLE = process.env.RECIPES_TABLE || 'Recipes_i2';
const GSI_TITLE_PREFIX = 'gsi_title_prefix';

const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

function normalizeRecipe(item) {
  if (!item) return null;
  
  try {
    // Handle both old format (directions, NER) and new format (instructions)
    for (const key of ['ingredients', 'directions', 'instructions', 'NER']) {
      if (item[key] && typeof item[key] === 'string') {
        try { 
          item[key] = JSON.parse(item[key]); 
        } catch (e) {
          console.warn(`Failed to parse ${key} for recipe ${item.recipe_id}:`, e.message);
        }
      }
    }
  
  // For backward compatibility, map instructions to directions if directions doesn't exist
  if (!item.directions && item.instructions) {
    item.directions = Array.isArray(item.instructions) ? item.instructions : [item.instructions];
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
    return null;
  }
}

// --- tagging utils ---
function textBag(recipe) {
  const parts = [];
  if (recipe.title) parts.push(String(recipe.title));
  if (Array.isArray(recipe.ingredients)) parts.push(...recipe.ingredients.map(String));
  const ner = Array.isArray(recipe.NER) ? recipe.NER : Array.isArray(recipe.ner) ? recipe.ner : [];
  parts.push(...ner.map(String));
  return parts.join(" ").toLowerCase();
}
function hasAny(txt, words) { return words.some(w => txt.includes(w)); }

function getHabits(recipe) {
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
  const txt = textBag(recipe);
  const cat = new Set();

  if (hasAny(txt, ["cake","cookie","brownie","pie","pudding","mousse","tart","frosting"])) cat.add("dessert");
  if (hasAny(txt, ["soup","broth","chowder","bisque"])) cat.add("soup");
  if (hasAny(txt, ["salad"])) cat.add("salad");
  if (hasAny(txt, ["smoothie","juice","latte","milkshake","punch","lemonade","drink"])) cat.add("drink");
  if (hasAny(txt, ["pancake","waffle","oatmeal","cereal","muffin","granola","omelet"])) cat.add("breakfast");
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
      // Prefix search: partition key is first letter, sort key uses begins_with
      const prefix = title_prefix.trim().toLowerCase();
      if (!prefix) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'title_prefix required' }) };
      }
      const pk = prefix[0];
      const queryParams = {
        TableName: TABLE,
        IndexName: GSI_TITLE_PREFIX,
        KeyConditionExpression: 'title_lc_first1 = :pk AND begins_with(title_lc, :pfx)',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':pfx': prefix
        },
        Limit: limit ? Number(limit) : 10,
        ExclusiveStartKey: next_token ? JSON.parse(Buffer.from(next_token, 'base64').toString()) : undefined,
      };
      // Use QueryCommand when using KeyConditionExpression against the GSI
      const data = await ddb.send(new QueryCommand(queryParams));
      const items = (data.Items || [])
        .map(normalizeRecipe)
        .filter(r => r !== null); // Remove null items from normalization errors
      let filtered = items;
      if (habit)    filtered = filtered.filter(r => Array.isArray(r.habits) && r.habits.includes(habit));
      if (category) filtered = filtered.filter(r => Array.isArray(r.categories) && r.categories.includes(category));
      if (diet_type && diet_type !== 'all') filtered = filtered.filter(r => Array.isArray(r.habits) && r.habits.includes(diet_type));
      if (allergy_filter && allergy_filter !== 'all') filtered = filtered.filter(r => Array.isArray(r.habits) && r.habits.includes(allergy_filter));
      const nextToken = data.LastEvaluatedKey ? Buffer.from(JSON.stringify(data.LastEvaluatedKey)).toString('base64') : undefined;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ items: filtered, count: filtered.length, next_token: nextToken })
      };
    }
    // Only category/habit filtering, scan table if no title_prefix
    if (category || habit || diet_type || allergy_filter) {
      // Scan multiple pages until enough results collected
      let items = [];
      let scanned = 0;
      let lastKey = next_token ? JSON.parse(Buffer.from(next_token, 'base64').toString()) : undefined;
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
    
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required parameters' }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
