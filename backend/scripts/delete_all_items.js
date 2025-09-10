import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

const REGION = "ap-southeast-2";
const TABLE = "Recipes_i2";
const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

async function deleteAllItems() {
  let lastKey = undefined;
  let totalDeleted = 0;
  do {
    const scanRes = await ddb.send(new ScanCommand({
      TableName: TABLE,
      ProjectionExpression: "recipe_id",
      ExclusiveStartKey: lastKey,
      Limit: 1000
    }));
    const items = scanRes.Items || [];
    if (items.length === 0) break;
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      const params = {
        RequestItems: {
          [TABLE]: batch.map(item => ({ DeleteRequest: { Key: { recipe_id: item.recipe_id } } }))
        }
      };
      await ddb.send(new BatchWriteCommand(params));
      totalDeleted += batch.length;
      console.log(`Deleted ${totalDeleted} items...`);
    }
    lastKey = scanRes.LastEvaluatedKey;
  } while (lastKey);
  console.log("All items deleted.");
}

deleteAllItems().catch(err => {
  console.error("Error deleting items:", err);
  process.exit(1);
});
