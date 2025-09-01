// recipes-api entry point
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const TABLE = process.env.RECIPES_TABLE || 'Recipes_v2';
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
  return item;
}

exports.handler = async (event) => {
  const headers = { 'access-control-allow-origin': '*' };
  try {
    const params = event.queryStringParameters || {};
    const { recipe_id, title_prefix, limit, next_token } = params;
    if (recipe_id) {
      const cmd = new GetCommand({ TableName: TABLE, Key: { recipe_id } });
      const { Item } = await ddb.send(cmd);
      if (!Item) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
      return { statusCode: 200, headers, body: JSON.stringify(normalizeRecipe(Item)) };
    }
    if (title_prefix) {
      // 前缀搜索，分区键取首字母，排序键用 begins_with
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
