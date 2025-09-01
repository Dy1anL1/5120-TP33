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
      const data = await ddb.send(new QueryCommand({
        TableName: TABLE,
        IndexName: GSI,
        KeyConditionExpression: "name_lc_first1 = :pk AND begins_with(name_lc, :pfx)",
        ExpressionAttributeValues: { ":pk": first1(q), ":pfx": q },
        Limit: 5,
      }));

      const candidate = (data.Items || [])[0];
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
