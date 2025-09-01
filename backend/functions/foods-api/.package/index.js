// foods-api entry point
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const REGION = process.env.AWS_REGION || "ap-southeast-2";
const TABLE = process.env.TABLE_NAME || process.env.FOODS_TABLE || "Foods_v2";
const GSI = process.env.GSI_NAME || "gsi_name_prefix";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

function b64e(o){ return Buffer.from(JSON.stringify(o)).toString("base64"); }
function b64d(s){ return JSON.parse(Buffer.from(s, "base64").toString()); }
function first1(s=""){
  s = (s||"").trim().toLowerCase();
  const c = s[0]; return (c>="a"&&c<="z") ? c : "#";
}

function parseMaybeJson(val){
  if (val == null) return val;
  if (typeof val === "object") return val;
  if (typeof val === "string"){
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}

function normalizeFood(item){
  if (!item) return item;
  item.nutrition_100g = parseMaybeJson(item.nutrition_100g);
  item.serving        = parseMaybeJson(item.serving);
  item.ingredient_analysis = parseMaybeJson(item.ingredient_analysis);
  item.labels         = parseMaybeJson(item.labels);
  item.package_size   = parseMaybeJson(item.package_size);
  item.alternate_names= parseMaybeJson(item.alternate_names);
  return item;
}

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const headers = {
    "access-control-allow-origin": "*",
    "content-type": "application/json",
    "access-control-allow-headers": "*",
  };

  try {
    const { id, name_prefix, limit, next_token } = qs;

  // 1) Get by primary key
    if (id){
      const { Item } = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id } }));
      if (!Item) return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };
      return { statusCode: 200, headers, body: JSON.stringify(normalizeFood(Item)) };
    }

  // 2) Prefix search
    if (name_prefix){
      const pfx = String(name_prefix).trim().toLowerCase();
      if (!pfx) return { statusCode: 400, headers, body: JSON.stringify({ error: "name_prefix required" }) };

      const data = await ddb.send(new QueryCommand({
        TableName: TABLE,
        IndexName: GSI,
        KeyConditionExpression: "name_lc_first1 = :pk AND begins_with(name_lc, :pfx)",
        ExpressionAttributeValues: { ":pk": first1(pfx), ":pfx": pfx },
        Limit: limit ? Number(limit) : 10,
        ExclusiveStartKey: next_token ? b64d(next_token) : undefined,
      }));

      const items = (data.Items || []).map(normalizeFood);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          items,
          count: items.length,
          next_token: data.LastEvaluatedKey ? b64e(data.LastEvaluatedKey) : null,
        }),
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing query" }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
