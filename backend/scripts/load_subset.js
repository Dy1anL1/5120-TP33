import fs from "fs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import csv from "csv-parser";

const REGION = "ap-southeast-2";
const TABLE = "Recipes_i1";
const MAX_ITEMS = 5000; // You can change this to between 2000-10000

const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

async function batchWriteAll(items, table) {
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    const params = {
      RequestItems: {
        [table]: batch.map((item) => ({ PutRequest: { Item: item } })),
      },
    };
    try {
      await ddb.send(new BatchWriteCommand(params));
      console.log(`Wrote items ${i + 1} - ${i + batch.length} successfully`);
    } catch (err) {
      console.error("Batch write error", err);
    }
  }
}

async function main() {
  const items = [];
  let count = 0;

  await new Promise((resolve, reject) => {
    fs.createReadStream("full_dataset.csv")
      .pipe(csv())
      .on("data", (row) => {
        if (count >= MAX_ITEMS) return;
        if (!row.title || !row.recipe_id) return;
        const titleLc = row.title.toLowerCase();
        const item = {
          recipe_id: row.recipe_id,
          title: row.title,
          title_lc: titleLc,
          title_lc_first1: titleLc[0],
          ingredients: row.ingredients ? row.ingredients.split("|") : [],
          directions: row.directions ? row.directions.split("|") : [],
          habits: row.habits ? row.habits.split(",") : [],
          categories: row.categories ? row.categories.split(",") : [],
        };
        items.push(item);
        count++;
      })
      .on("end", resolve)
      .on("error", reject);
  });

  console.log(`Preparing to write ${items.length} items to DynamoDB`);
  await batchWriteAll(items, TABLE);
  console.log("All done");
}

main().catch((err) => {
  console.error("Script execution error", err);
  process.exit(1);
});