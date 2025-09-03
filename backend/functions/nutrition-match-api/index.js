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

function norm(s = "") {
  return String(s)
    .toLowerCase()
    .replace(/[\d./-]+/g, " ")
    // remove standalone unit words when normalizing
    .replace(/\b(cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|g|kg|oz|ml|l|pounds?|lb|slice|slices|cloves?)\b/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Parse numeric quantity tokens including fractions like "1/2" or mixed "1 1/2"
function parseNumberToken(s) {
  if (!s) return null;
  s = String(s).trim();
  // mixed number e.g. "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + (Number(mixed[2]) / Number(mixed[3]));
  // fraction e.g. "1/2"
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const num = Number(s.replace(/[,]/g, ''));
  return Number.isFinite(num) ? num : null;
}

// Convert common volume units to millilitres
const UNIT_TO_ML = {
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  cup: 240,
  cups: 240,
  l: 1000,
  ml: 1,
  oz: 29.5735,
};

// A tiny density map (grams per ml) for common groups; these are approximations.
// If ingredient name contains these keys, use density to convert ml -> g. Otherwise default 1 g/ml.
const DENSITY_HINTS = {
  oil: 0.92, // example: olive oil ~0.91-0.93 g/ml
  olive: 0.92,
  milk: 1.03,
  water: 1.0,
};

// Try to extract an explicit grams value from text like "(400g)" or "400 g"
function extractGramsFromText(s) {
  if (!s) return null;
  const m = String(s).toLowerCase().match(/(\d+[\d.,]*)\s*(g|grams?)\b/);
  if (m) return parseNumberToken(m[1].replace(/,/g, ''));
  return null;
}

// Try to extract a numeric quantity + unit (tsp/tbsp/ml/l/oz/cup) and convert to grams
function extractGramsByUnit(s, ingredientNameForDensity = '') {
  if (!s) return null;
  const txt = String(s).toLowerCase();
  // match patterns like "1 1/2 tbsp", "2tbsp", "0.5 cup"
  const m = txt.match(/(\d+[\d\/.\s]*)\s*(tsp|teaspoons?|tbsp|tablespoons?|cup|cups|ml|l|oz)\b/);
  if (!m) return null;
  const num = parseNumberToken(m[1].trim());
  if (!num) return null;
  const unit = m[2].replace(/s$/,'');
  const mlPerUnit = UNIT_TO_ML[unit] || 0;
  if (!mlPerUnit) return null;
  const ml = num * mlPerUnit;
  // determine density hint from ingredient name
  let density = 1.0;
  for (const hint of Object.keys(DENSITY_HINTS)) {
    if (ingredientNameForDensity.includes(hint)) { density = DENSITY_HINTS[hint]; break; }
  }
  // fallback density 1 g/ml
  return ml * density;
}

// Top-level helper: given the raw ingredient string, return { grams, cleaned } where cleaned
// is the ingredient text with quantity/unit removed for lookup.
function parseIngredientQuantity(raw) {
  if (!raw) return { grams: null, cleaned: String(raw || '').trim() };
  const rawStr = String(raw);
  // prefer explicit grams like (400g)
  const gramsExplicit = extractGramsFromText(rawStr);
  let cleaned = rawStr.replace(/\([^)]*\)/g, ' '); // remove parenthesis content for cleanup
  // remove common quantity tokens e.g. "2 tbsp", "1/2 tsp", "200g"
  cleaned = cleaned.replace(/\b\d+[\d\/.\s]*(tsp|teaspoons?|tbsp|tablespoons?|cup|cups|ml|l|oz|g|grams?|kg|pounds?|lb)\b/ig, ' ');
  cleaned = cleaned.replace(/[\d.,]+\s*(g|grams?)\b/ig, ' ');
  cleaned = cleaned.replace(/^[\d\s\/\.\-]+/, '');
  cleaned = cleaned.trim();
  if (gramsExplicit) return { grams: gramsExplicit, cleaned };
  // try unit-based extraction using cleaned (which still contains words to hint density)
  const gramsByUnit = extractGramsByUnit(rawStr, cleaned.toLowerCase());
  if (gramsByUnit) return { grams: gramsByUnit, cleaned };
  return { grams: null, cleaned };
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
    if (!event.body) return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing body" }) };
    const { ingredients } = JSON.parse(event.body);
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "ingredients[] required" }) };
    }

    const results = [];
    const summary = {};

    for (const raw of ingredients) {
      const q = norm(raw);
      if (!q) { results.push({ ingredient: raw, query: q, match: null }); continue; }

  // Query by prefix, take the first match
      // First attempt: items whose normalized name begins with the query prefix
      let data = await ddb.send(new QueryCommand({
        TableName: TABLE,
        IndexName: GSI,
        KeyConditionExpression: "name_lc_first1 = :pk AND begins_with(name_lc, :pfx)",
        ExpressionAttributeValues: { ":pk": first1(q), ":pfx": q },
        Limit: 5,
      }));

      let candidate = (data.Items || [])[0];

      // Fallback: if no candidate found, search the same partition for items that contain the
      // query as a substring (this handles cases like "extra virgin olive oil" vs "olive oil").
      if (!candidate) {
        data = await ddb.send(new QueryCommand({
          TableName: TABLE,
          IndexName: GSI,
          KeyConditionExpression: "name_lc_first1 = :pk",
          FilterExpression: "contains(name_lc, :pfx)",
          ExpressionAttributeValues: { ":pk": first1(q), ":pfx": q },
          Limit: 25,
        }));
        candidate = (data.Items || [])[0];
      }
      if (candidate) {
        const nutrition = parseMaybeJson(candidate.nutrition_100g);
        addInto(summary, nutrition);
        results.push({
          ingredient: raw,
          query: q,
          match: { id: candidate.id, name: candidate.name, nutrition_100g: nutrition }
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
        note: "Approximation using 100g per matched ingredient; amounts not scaled (Iteration 1 demo).",
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
