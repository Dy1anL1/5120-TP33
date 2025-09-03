// nutrition-match-api entry point
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const REGION = process.env.AWS_REGION || "ap-southeast-2";
const TABLE = process.env.TABLE_NAME || process.env.FOODS_TABLE || "Foods_v2";
const GSI = process.env.GSI_NAME || "gsi_name_prefix";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

function first1(s = "") {
  s = (s || "").trim().toLowerCase();
  const c = s[0];
  return (c >= "a" && c <= "z") ? c : "#";
}

function parseMaybeJson(v) {
  if (!v) return v;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function normNameForQuery(s = "") {
  return String(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // remove all punctuation (including , .)
    .replace(/\s+/g, " ")
    .trim();
}

// Remove stopwords and unit words from ingredient name
function cleanIngredientName(name = "") {
  return name.replace(/\b(clove|cloves|slice|slices|of|fresh|large|small|extra|virgin)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addInto(sum, obj) {
  if (!obj) return;
  for (const [k, v] of Object.entries(obj)) {
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    sum[k] = (sum[k] || 0) + n;
  }
}

// Unit conversion table (approximate)
const UNIT_TO_GRAM = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  oz: 28.35,
  pound: 453.6,
  lb: 453.6,
  ml: 1,
  l: 1000,
  cup: 240,
  cups: 240,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5
};

function parseAmountUnit(str) {
  // Parse like "1.5 tbsp sugar", return {amount: 1.5, unit: 'tbsp', name: 'sugar'}
  const re = /([\d.\/]+)\s*(kg|g|gram|grams|oz|lb|pound|ml|l|cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons)?\s*(.*)/i;
  const m = String(str).match(re);
  if (!m) return { amount: 100, unit: 'g', name: str };
  let amount = m[1];
  if (amount.includes('/')) {
    // Handle fractions like "1/2"
    const parts = amount.split('/');
    if (parts.length === 2) amount = Number(parts[0]) / Number(parts[1]);
    else amount = Number(parts[0]);
  } else {
    amount = Number(amount);
  }
  const unit = (m[2] || 'g').toLowerCase();
  const name = m[3].trim();
  return { amount, unit, name };
}

exports.handler = async (event) => {
  const headers = {
    "access-control-allow-origin": "*",
    "content-type": "application/json",
    "access-control-allow-headers": "*",
  };
  try {
    if (!event.body) return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing body" }) };
    const { ingredients } = JSON.parse(event.body);
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "ingredients[] required" }) };
    }

    const results = [];
    const summary = {};

    for (const raw of ingredients) {
      // Parse amount, unit, and main ingredient
      const { amount, unit, name } = parseAmountUnit(raw);
      const cleaned = cleanIngredientName(name);
      const q = normNameForQuery(cleaned);
      if (!q) { results.push({ ingredient: raw, query: q, match: null }); continue; }

      // Query by prefix, take the first match
      let data = await ddb.send(new QueryCommand({
        TableName: TABLE,
        IndexName: GSI,
        KeyConditionExpression: "name_lc_first1 = :pk AND begins_with(name_lc, :pfx)",
        ExpressionAttributeValues: { ":pk": first1(q), ":pfx": q },
        Limit: 5,
      }));

      let candidate = (data.Items || [])[0];
      // Fallback: contains query if prefix fails (DynamoDB limitation: only works if name_lc is not a key)
      if (!candidate) {
        try {
          const data2 = await ddb.send(new QueryCommand({
            TableName: TABLE,
            IndexName: GSI,
            KeyConditionExpression: "name_lc_first1 = :pk",
            FilterExpression: "contains(name_lc, :pfx)",
            ExpressionAttributeValues: { ":pk": first1(q), ":pfx": q },
            Limit: 25,
          }));
          candidate = (data2.Items || [])[0];
        } catch (e) {
          // fallback failed, ignore
        }
      }
      if (candidate) {
        const nutrition = parseMaybeJson(candidate.nutrition_100g);
        // Convert unit to grams
        const gram = amount * (UNIT_TO_GRAM[unit] || 1);
        // Accumulate nutrition based on actual amount used
        for (const [k, v] of Object.entries(nutrition)) {
          const n = Number(v) * (gram / 100);
          if (!Number.isFinite(n)) continue;
          summary[k] = (summary[k] || 0) + n;
        }
        results.push({
          ingredient: raw,
          query: q,
          match: { id: candidate.id, name: candidate.name, nutrition_100g: nutrition, gram_used: gram }
        });
      } else {
        results.push({ ingredient: raw, query: q, match: null });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        results,
        summary_100g_sum: summary,
        note: "Nutrition is estimated based on matched ingredient and parsed amount/unit. If no match, try simplifying ingredient name or supplementing database.",
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
