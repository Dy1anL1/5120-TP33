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
// nutrition-match-api entry point
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const REGION = process.env.AWS_REGION || "ap-southeast-2";
const TABLE = process.env.FOODS_TABLE || "Foods_v2";
const GSI = process.env.FOODS_GSI || "gsi_name_prefix";

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

function norm(s = "") {
  return String(s)
    .toLowerCase()
    .replace(/[\d./-]+/g, " ")
    .replace(/\b(cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|g|kg|oz|ml|l|pounds?|lb|slice|slices|cloves?)\b/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
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

exports.handler = async (event) => {
  const headers = {
    "access-control-allow-origin": "*",
    "content-type": "application/json",
    "access-control-allow-headers": "*",
  };
  try {
    // Accept either a stringified `body` (API Gateway) or top-level `ingredients` (Lambda console)
    let body = null;
    if (event && event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (err) {
        console.log('Could not JSON.parse(event.body), using raw body:', err && err.message);
        body = event.body;
      }
    } else if (event && event.ingredients) {
      body = { ingredients: event.ingredients };
    } else if (event) {
      // fallback: maybe payload was provided directly
      body = event;
    }

    if (!body) {
      console.log('Missing body / ingredients in event:', JSON.stringify(event).slice(0, 1000));
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing body' }) };
    }

    const { ingredients } = body;
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'ingredients[] required' }) };
    }

    const results = [];
    const summary = {};

    for (const rawItem of ingredients) {
      // rawItem can be string or object { text, label }
      const raw = typeof rawItem === 'string' ? rawItem : (rawItem.text || '');
      const providedLabel = typeof rawItem === 'object' ? (rawItem.label || null) : null;
      // Parse amount, unit, and main ingredient
      const { amount, unit, name } = parseAmountUnit(raw);
      const q = norm(name);
      if (!q) { results.push({ ingredient: rawItem, query: q, match: null }); continue; }

      // Query by prefix, take the first match
      let data = await ddb.send(new QueryCommand({
        TableName: TABLE,
        IndexName: GSI,
        KeyConditionExpression: "name_lc_first1 = :pk AND begins_with(name_lc, :pfx)",
        ExpressionAttributeValues: { ":pk": first1(q), ":pfx": q },
        Limit: 5,
      }));

      // Prefer a candidate whose labels match providedLabel (if any) - be tolerant to labels stored as object/array/string
      let candidate = null;
      const items = data.Items || [];
      console.log('Query:', q, 'candidates:', items.length, 'providedLabel:', providedLabel);
      if (providedLabel && items.length > 0) {
        for (const it of items) {
          const rawLabels = parseMaybeJson(it.labels);
          let labelKeys = [];
          if (Array.isArray(rawLabels)) {
            labelKeys = rawLabels.map(String);
          } else if (rawLabels && typeof rawLabels === 'object') {
            labelKeys = Object.keys(rawLabels).map(String);
          } else if (typeof rawLabels === 'string') {
            // try parse JSON string
            try {
              const p = JSON.parse(rawLabels);
              if (Array.isArray(p)) labelKeys = p.map(String);
              else if (p && typeof p === 'object') labelKeys = Object.keys(p).map(String);
              else labelKeys = [String(p)];
            } catch (e) {
              labelKeys = [rawLabels];
            }
          }
          if (labelKeys.includes(String(providedLabel))) { candidate = it; break; }
        }
      }
      if (!candidate && items.length > 0) candidate = items[0];
      if (candidate) {
        console.log('Selected id:', candidate.id, 'name:', candidate.name);
        const nutrition = parseMaybeJson(candidate.nutrition_100g);
        // Convert unit to grams
        const gram = amount * (UNIT_TO_GRAM[unit] || 1);
        // Accumulate nutrition based on actual amount used
        for (const [k, v] of Object.entries(nutrition)) {
          let n = Number(v) * (gram / 100);
          if (!Number.isFinite(n)) continue;

          // Apply sodium adjustment logic
          if (k === 'sodium' || k === 'sodium_mg') {
            if (n > 10000) {
              n = n / 100;
            } else if (n > 5000) {
              n = n / 20;
            } else if (n > 1000) {
              n = n / 10;
            }
          }

          summary[k] = (summary[k] || 0) + n;
        }
        results.push({
          ingredient: rawItem,
          query: q,
          match: { id: candidate.id, name: candidate.name, nutrition_100g: nutrition, gram_used: gram, matched_label: providedLabel || null }
        });
      } else {
        results.push({ ingredient: rawItem, query: q, match: null });
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
