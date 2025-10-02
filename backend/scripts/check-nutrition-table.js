const { DynamoDBClient, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({ region: "ap-southeast-2" });

async function checkTable() {
    try {
        const result = await client.send(new DescribeTableCommand({ TableName: "Foods_v2" }));
        const table = result.Table;

        console.log("=== TABLE STRUCTURE ===");
        console.log("Table Name:", table.TableName);
        console.log("Table Status:", table.TableStatus);

        console.log("\n=== PRIMARY KEY ===");
        console.log("Key Schema:", JSON.stringify(table.KeySchema, null, 2));

        console.log("\n=== ATTRIBUTES ===");
        console.log("Attribute Definitions:", JSON.stringify(table.AttributeDefinitions, null, 2));

        if (table.GlobalSecondaryIndexes) {
            console.log("\n=== GLOBAL SECONDARY INDEXES ===");
            table.GlobalSecondaryIndexes.forEach((gsi, index) => {
                console.log(`GSI ${index + 1}:`);
                console.log("  Index Name:", gsi.IndexName);
                console.log("  Key Schema:", JSON.stringify(gsi.KeySchema, null, 2));
                console.log("  Projection:", JSON.stringify(gsi.Projection, null, 2));
            });
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
}

checkTable();