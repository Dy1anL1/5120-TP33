// recipes-api entry point
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const TABLE = process.env.RECIPES_TABLE || 'Recipes_i1';
const GSI_TITLE_PREFIX = 'gsi_title_prefix';

const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

function normalizeRecipe(item) {
  if (!item) return item;
  for (const key of ['ingredients', 'directions', 'NER']) {
    if (typeof item[key] === 'string') {
      try { item[key] = JSON.parse(item[key]); } catch {}
    }
  }
  item.habits = getHabits(item);
  item.categories = getCategories(item);
  return item;
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
  const headers = { 'access-control-allow-origin': '*' };
  try {
    const params = event.queryStringParameters || {};
    const { recipe_id, title_prefix, limit, next_token, habit, category } = params;
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
      const data = await ddb.send(new QueryCommand(queryParams));
      const items = (data.Items || []).map(normalizeRecipe);
      let filtered = items;
      if (habit)    filtered = filtered.filter(r => Array.isArray(r.habits) && r.habits.includes(habit));
      if (category) filtered = filtered.filter(r => Array.isArray(r.categories) && r.categories.includes(category));
      const nextToken = data.LastEvaluatedKey ? Buffer.from(JSON.stringify(data.LastEvaluatedKey)).toString('base64') : undefined;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ items: filtered, count: filtered.length, next_token: nextToken })
      };
    }
    // Only category/habit filtering, scan table if no title_prefix
    if (category || habit) {
      // DynamoDB scan, supports pagination and limit
      const scanParams = {
        TableName: TABLE,
        Limit: limit ? Number(limit) : 10,
        ExclusiveStartKey: next_token ? JSON.parse(Buffer.from(next_token, 'base64').toString()) : undefined,
      };
      const data = await ddb.send(new QueryCommand(scanParams));
      let items = (data.Items || []).map(normalizeRecipe);
      if (habit)    items = items.filter(r => Array.isArray(r.habits) && r.habits.includes(habit));
      if (category) items = items.filter(r => Array.isArray(r.categories) && r.categories.includes(category));
      const nextToken = data.LastEvaluatedKey ? Buffer.from(JSON.stringify(data.LastEvaluatedKey)).toString('base64') : undefined;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ items, count: items.length, next_token: nextToken })
      };
    }
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing query' }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
