#!/usr/bin/env node
/**
 * Clear all items from Foods_v2 DynamoDB table
 * WARNING: This will delete all data in the table!
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } = require("@aws-sdk/lib-dynamodb");

// Configuration
const TABLE_NAME = "Foods_v2";
const REGION = "ap-southeast-2";
const BATCH_SIZE = 25; // DynamoDB batch delete limit

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(ddbClient);

async function batchDelete(items) {
    if (items.length === 0) return 0;

    const deleteRequests = items.map(item => ({
        DeleteRequest: {
            Key: { id: item.id } // Only need the primary key
        }
    }));

    const params = {
        RequestItems: {
            [TABLE_NAME]: deleteRequests
        }
    };

    try {
        const result = await ddb.send(new BatchWriteCommand(params));

        // Handle unprocessed items
        if (result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0) {
            console.warn(`${Object.keys(result.UnprocessedItems[TABLE_NAME] || {}).length} items were not processed, retrying...`);

            // Retry unprocessed items
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            const retryParams = { RequestItems: result.UnprocessedItems };
            await ddb.send(new BatchWriteCommand(retryParams));
        }

        return deleteRequests.length;
    } catch (error) {
        console.error('Batch delete error:', error);
        throw error;
    }
}

async function clearTable() {
    console.log(`🗑️  Starting to clear all items from table: ${TABLE_NAME}`);
    console.log(`⚠️  WARNING: This will DELETE ALL DATA in the table!`);

    // Confirmation prompt (in a real environment you might want to add readline)
    console.log(`🔄 Proceeding with table clearing in 3 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    let totalDeleted = 0;
    let lastEvaluatedKey = undefined;
    let scanCount = 0;

    do {
        scanCount++;
        console.log(`📊 Scan ${scanCount}: Fetching items...`);

        try {
            // Scan the table to get items
            const scanParams = {
                TableName: TABLE_NAME,
                ProjectionExpression: "id", // Only fetch the primary key
                Limit: 100 // Fetch 100 items at a time
            };

            if (lastEvaluatedKey) {
                scanParams.ExclusiveStartKey = lastEvaluatedKey;
            }

            const scanResult = await ddb.send(new ScanCommand(scanParams));
            const items = scanResult.Items || [];

            console.log(`📦 Found ${items.length} items in this batch`);

            if (items.length === 0) {
                console.log(`✅ No more items to delete`);
                break;
            }

            // Delete items in batches
            const batches = [];
            for (let i = 0; i < items.length; i += BATCH_SIZE) {
                batches.push(items.slice(i, i + BATCH_SIZE));
            }

            for (const [index, batch] of batches.entries()) {
                console.log(`🗑️  Deleting batch ${index + 1}/${batches.length} (${batch.length} items)...`);
                const deleted = await batchDelete(batch);
                totalDeleted += deleted;

                // Small delay to avoid throttling
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            lastEvaluatedKey = scanResult.LastEvaluatedKey;
            console.log(`✅ Batch complete. Total deleted so far: ${totalDeleted}`);

        } catch (error) {
            console.error(`❌ Error during scan ${scanCount}:`, error);
            throw error;
        }

    } while (lastEvaluatedKey);

    console.log(`\n🎉 Table clearing completed!`);
    console.log(`📊 Total items deleted: ${totalDeleted}`);

    // Verify the table is empty
    console.log(`\n🔍 Verifying table is empty...`);
    try {
        const verifyResult = await ddb.send(new ScanCommand({
            TableName: TABLE_NAME,
            Select: 'COUNT'
        }));

        const remainingCount = verifyResult.Count || 0;
        if (remainingCount === 0) {
            console.log(`✅ Table is now empty - ready for fresh data upload!`);
        } else {
            console.log(`⚠️  Warning: ${remainingCount} items still remain in table`);
        }
    } catch (error) {
        console.warn(`⚠️  Could not verify table status:`, error.message);
    }
}

async function main() {
    try {
        await clearTable();
        console.log(`\n🚀 Table cleared successfully! You can now run upload-foods.js`);
    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}