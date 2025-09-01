// recipes-api entry point
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const TABLE = process.env.RECIPES_TABLE || 'recipes';
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

module.exports = async function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*');
  try {
    const { recipe_id, title_prefix, limit, next_token } = req.query || {};
    if (recipe_id) {
      // Get by recipe_id
      const cmd = new GetCommand({ TableName: TABLE, Key: { recipe_id } });
      const { Item } = await ddb.send(cmd);
      if (!Item) return res.status(404).json({ error: 'Not found' });
      return res.json(normalizeRecipe(Item));
    }
    if (title_prefix) {
      // Query by title_prefix (GSI)
      const params = {
        TableName: TABLE,
        IndexName: GSI_TITLE_PREFIX,
        KeyConditionExpression: 'title_prefix = :prefix',
        ExpressionAttributeValues: { ':prefix': title_prefix },
        Limit: limit ? Number(limit) : 10,
        ExclusiveStartKey: next_token ? JSON.parse(Buffer.from(next_token, 'base64').toString()) : undefined,
      };
      const data = await ddb.send(new QueryCommand(params));
      const items = (data.Items || []).map(normalizeRecipe);
      const nextToken = data.LastEvaluatedKey ? Buffer.from(JSON.stringify(data.LastEvaluatedKey)).toString('base64') : undefined;
      return res.json({ recipes: items, nextToken });
    }
    return res.status(400).json({ error: 'Missing query' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
