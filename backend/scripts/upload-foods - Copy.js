#!/usr/bin/env node
/**
 * Upload Foods_v2 CSV data to DynamoDB table
 * Uses the same AWS SDK as the Lambda functions
 */

const fs = require('fs');
const path = require('path');
const { DynamoDBClient, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, BatchWriteCommand } = require("@aws-sdk/lib-dynamodb");

// Configuration
const TABLE_NAME = "Foods_v2";
const BATCH_SIZE = 25; // DynamoDB batch write limit
const CSV_FILE = path.join(__dirname, 'opennutrition_foods.csv');
const REGION = "ap-southeast-2";

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(ddbClient);

const STOPWORDS = new Set([
    'fresh', 'large', 'small', 'medium', 'thinly', 'thickly', 'finely', 'coarsely',
    'lightly', 'heavily', 'extra', 'virgin', 'organic', 'raw', 'cooked', 'prepared',
    'halved', 'quartered', 'lengthwise', 'and', 'or', 'the', 'with', 'without',
    'optional', 'pieces', 'piece', 'slices', 'slice', 'chopped', 'diced', 'minced',
    'shredded', 'crumbled', 'ground', 'julienned', 'peeled', 'seeded', 'quartered',
    'sprigs', 'sprig', 'cloves', 'clove', 'heads', 'head', 'sticks', 'stick'
]);

const TYPE_KEYWORDS = [
    { type: 'produce', keywords: ['lettuce', 'onion', 'pepper', 'potato', 'potatoes', 'apple', 'banana', 'fig', 'figs', 'lemon', 'lime', 'limejuice', 'garlic', 'carrot', 'celery', 'cabbage', 'spinach', 'herb', 'parsley', 'cilantro', 'coriander', 'broccoli', 'cauliflower', 'mushroom'] },
    { type: 'herb', keywords: ['thyme', 'rosemary', 'basil', 'oregano', 'parsley', 'dill', 'sage', 'mint'] },
    { type: 'spice', keywords: ['cumin', 'pepper', 'paprika', 'turmeric', 'cinnamon', 'nutmeg', 'chili', 'chilli', 'garam', 'masala'] },
    { type: 'meat', keywords: ['bacon', 'ham', 'beef', 'chicken', 'hen', 'pork', 'lamb', 'duck', 'turkey', 'sausage'] },
    { type: 'seafood', keywords: ['salmon', 'tuna', 'shrimp', 'prawn', 'cod', 'crab', 'lobster', 'anchovy'] },
    { type: 'dairy', keywords: ['cheese', 'milk', 'cream', 'yogurt', 'butter'] },
    { type: 'condiment', keywords: ['harissa', 'vinegar', 'mayonnaise', 'ketchup', 'mustard', 'sauce', 'oil', 'dressing'] },
    { type: 'bakery', keywords: ['roll', 'bread', 'bagel', 'bun', 'pastry'] },
];

function toTitleCase(str) {
    return str.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1));
}

function sanitizeName(name = '') {
    let cleaned = String(name || '').trim();
    cleaned = cleaned.replace(/\s+/g, ' ');
    return cleaned;
}

function normalizeForSearch(name = '') {
    return sanitizeName(name)
        .toLowerCase()
        .replace(/[\(\)\[\]\{\}]/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractCanonicalName(name = '') {
    let canonical = name;
    const byIndex = canonical.toLowerCase().lastIndexOf(' by ');
    if (byIndex > 0) {
        canonical = canonical.slice(0, byIndex);
    }
    canonical = canonical.replace(/\(.*?\)/g, ' ');
    canonical = canonical.replace(/\s+/g, ' ');
    return sanitizeName(canonical);
}

function createNameIndexes(name) {
    if (!name) return { name_lc: "", name_lc_first1: "" };
    const name_lc = name.toLowerCase().trim();
    const first = name_lc[0];
    return {
        name_lc,
        name_lc_first1: first >= 'a' && first <= 'z' ? first : '#'
    };
}

function ensureArray(value, fallback = []) {
    if (Array.isArray(value)) return value;
    if (value == null) return fallback.slice();
    if (typeof value === 'string' && value.trim() !== '') return [value];
    return fallback.slice();
}

function addUniqueValues(targetSet, values = []) {
    values.forEach((value) => {
        const val = sanitizeName(value);
        if (val) targetSet.add(val);
    });
}

function singularize(word = '') {
    if (word.endsWith('ies')) {
        return word.slice(0, -3) + 'y';
    }
    if (word.endsWith('ses') || word.endsWith('xes')) {
        return word.slice(0, -2);
    }
    if (word.endsWith('s') && word.length > 3) {
        return word.slice(0, -1);
    }
    return word;
}

function pluralize(word = '') {
    if (word.endsWith('y') && word.length > 1) {
        return word.slice(0, -1) + 'ies';
    }
    if (word.endsWith('s')) return word;
    return word + 's';
}

function generateAlternateNames(name) {
    const results = new Set();
    const cleaned = sanitizeName(name);
    if (!cleaned) return [];

    const canonical = extractCanonicalName(cleaned);
    const normalized = normalizeForSearch(canonical);
    const originalNorm = normalizeForSearch(cleaned);

    const canonicalTitle = toTitleCase(canonical);
    const normalizedTitle = toTitleCase(normalized);

    addUniqueValues(results, [
        cleaned,
        canonical,
        canonicalTitle,
        normalized,
        normalizedTitle
    ]);

    const tokens = normalized.split(' ').filter(Boolean);
    const filtered = tokens.filter(token => !STOPWORDS.has(token));

    addUniqueValues(results, filtered);

    if (filtered.length > 0) {
        addUniqueValues(results, [filtered.join(' ')]);
        if (filtered.length >= 2) {
            addUniqueValues(results, [filtered.slice(-2).join(' '), filtered.slice(-1)[0]]);
        }
        filtered.forEach(token => addUniqueValues(results, [toTitleCase(token)]));
    }

    if (tokens.length > 1) {
        addUniqueValues(results, [
            tokens.slice(-2).join(' '),
            tokens.slice(-1)[0],
            toTitleCase(tokens.slice(-2).join(' ')),
            toTitleCase(tokens.slice(-1)[0])
        ]);
    }

    tokens.forEach(token => {
        const singular = singularize(token);
        const plural = pluralize(token);
        addUniqueValues(results, [singular, plural, toTitleCase(singular), toTitleCase(plural)]);
    });

    if (originalNorm && originalNorm !== normalized) {
        addUniqueValues(results, [originalNorm, toTitleCase(originalNorm)]);
    }

    return Array.from(results).filter(Boolean);
}

function mergeAlternateNames(original, generated) {
    const originalArray = ensureArray(original, []);
    const set = new Set(originalArray.map(sanitizeName));
    addUniqueValues(set, generated);
    return Array.from(set).filter(Boolean);
}

function classifyType(name, currentType) {
    const normalized = normalizeForSearch(name);
    const hasBrandMarker = /\bby\b/.test(name.toLowerCase());

    if (currentType && currentType !== 'grocery') {
        return hasBrandMarker ? currentType : currentType;
    }

    for (const { type, keywords } of TYPE_KEYWORDS) {
        if (keywords.some(keyword => normalized.includes(keyword))) {
            return type;
        }
    }

    if (hasBrandMarker) return 'prepared';
    return currentType || 'grocery';
}

function augmentItem(item) {
    item.name = sanitizeName(item.name);
    const generatedAlternateNames = generateAlternateNames(item.name);
    item.alternate_names = mergeAlternateNames(item.alternate_names, generatedAlternateNames);
    item.type = classifyType(item.name, item.type);

    if (item.alternate_names.length === 0 && item.name) {
        item.alternate_names.push(item.name);
    }

    const indexes = createNameIndexes(item.name);
    item.name_lc = indexes.name_lc;
    item.name_lc_first1 = indexes.name_lc_first1;

    return item;
}

function parseCSVLine(line) {
    // Simple CSV parser that handles quoted fields with commas
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i += 2;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current.trim());
            current = '';
            i++;
        } else {
            current += char;
            i++;
        }
    }

    // Add the last field
    result.push(current.trim());
    return result;
}

function safeJsonParse(str, defaultValue = null) {
    try {
        if (!str || str.trim() === '') return defaultValue;
        return JSON.parse(str);
    } catch (e) {
        console.warn(`Failed to parse JSON: ${str.substring(0, 50)}...`);
        return defaultValue;
    }
}

function processNutritionData(nutritionStr) {
    const nutrition = safeJsonParse(nutritionStr, {});

    // Convert numeric values and ensure proper types
    const processed = {};
    for (const [key, value] of Object.entries(nutrition)) {
        if (typeof value === 'number' && !isNaN(value)) {
            processed[key] = value;
        } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
            processed[key] = parseFloat(value);
        } else {
            processed[key] = value;
        }
    }

    return processed;
}

function csvRowToItem(row, headers) {
    try {
        const nameIndexes = createNameIndexes(row[1]);

        const parsedServing = safeJsonParse(row[6], {});
        const item = {
            id: row[0], // Primary key
            name: row[1],
            name_lc: nameIndexes.name_lc, // GSI sort key
            name_lc_first1: nameIndexes.name_lc_first1, // GSI partition key
            alternate_names: safeJsonParse(row[2], []),
            description: row[3] || "",
            type: row[4] || "everyday",
            source: safeJsonParse(row[5], []),
            serving: parsedServing,
            nutrition_100g: processNutritionData(row[7])
        };

        // Add optional fields if they exist
        if (row[8]) item.ean_13 = row[8];
        if (row[9]) item.labels = safeJsonParse(row[9], []);
        if (row[10]) item.package_size = row[10];
        if (row[11]) item.ingredients = row[11];
        if (row[12]) item.ingredient_analysis = safeJsonParse(row[12], {});

        return augmentItem(item);
    } catch (error) {
        console.error(`Error processing row with ID ${row[0]}: ${error.message}`);
        return null;
    }
}

async function batchWrite(items) {
    const putRequests = items.filter(item => item !== null).map(item => ({
        PutRequest: { Item: item }
    }));

    if (putRequests.length === 0) return;

    const params = {
        RequestItems: {
            [TABLE_NAME]: putRequests
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

        return putRequests.length;
    } catch (error) {
        console.error('Batch write error:', error);
        throw error;
    }
}

async function main() {
    console.log(`🚀 Starting upload of ${CSV_FILE} to DynamoDB table ${TABLE_NAME}`);

    // Check if table exists
    try {
        await ddbClient.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
        console.log(`✅ Table ${TABLE_NAME} found`);
    } catch (error) {
        if (error.name === 'ResourceNotFoundException') {
            console.error(`❌ Table ${TABLE_NAME} not found. Please create it first.`);
            return;
        }
        throw error;
    }

    // Check if CSV file exists
    if (!fs.existsSync(CSV_FILE)) {
        console.error(`❌ CSV file not found: ${CSV_FILE}`);
        return;
    }

    console.log(`📖 Reading CSV file...`);
    const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
        console.error('❌ CSV file appears to be empty or invalid');
        return;
    }

    const headers = parseCSVLine(lines[0]);
    console.log(`📊 Found ${headers.length} columns in CSV`);
    console.log(`📊 Processing ${lines.length - 1} data rows`);

    let batch = [];
    let totalProcessed = 0;
    let totalUploaded = 0;
    let errors = 0;

    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);

        if (row.length !== headers.length) {
            console.warn(`⚠️ Row ${i} has ${row.length} columns, expected ${headers.length}`);
        }

        const item = csvRowToItem(row, headers);
        totalProcessed++;

        if (item) {
            batch.push(item);
        } else {
            errors++;
        }

        // Upload in batches
        if (batch.length >= BATCH_SIZE) {
            try {
                const uploaded = await batchWrite(batch);
                totalUploaded += uploaded;
                console.log(`✅ Uploaded batch: ${totalUploaded} items total`);
                batch = [];

                // Small delay to avoid throttling
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`❌ Error uploading batch: ${error.message}`);
                errors += batch.length;
                batch = [];
            }
        }

        // Progress update
        if (i % 500 === 0) {
            console.log(`📊 Processed ${i} rows...`);
        }
    }

    // Upload remaining items
    if (batch.length > 0) {
        try {
            const uploaded = await batchWrite(batch);
            totalUploaded += uploaded;
            console.log(`✅ Uploaded final batch: ${totalUploaded} items total`);
        } catch (error) {
            console.error(`❌ Error uploading final batch: ${error.message}`);
            errors += batch.length;
        }
    }

    console.log(`\n🎉 Upload completed!`);
    console.log(`📊 Total rows processed: ${totalProcessed}`);
    console.log(`✅ Total items uploaded: ${totalUploaded}`);
    console.log(`❌ Total errors: ${errors}`);

    console.log('\n🔍 Upload summary:');
    console.log(`- Success rate: ${((totalUploaded / totalProcessed) * 100).toFixed(1)}%`);

    if (errors > 0) {
        console.log(`⚠️ ${errors} items failed to upload`);
    }
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
}
