// Query handlers for different types of recipe requests
// OPTIMIZED VERSION - Uses FilterExpression, parallel scanning, and caching
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { TABLE, LIMITS } = require('../config/constants');
const { normalizeRecipes } = require('./dataProcessor');
const { applyAllFilters } = require('./filterLogic');
const { parseNextToken, encodeNextToken, validateLimit, createResponse, createPaginatedResponse } = require('./utils');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const ddb = DynamoDBDocumentClient.from(client);

// ============================================================================
// OPTIMIZATION: Lambda Memory Cache (persists across warm starts)
// ============================================================================
const queryCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

function getCacheKey(params) {
  return JSON.stringify({
    title: params.title_prefix,
    cat: params.category,
    diet: params.diet_type,
    allergy: params.allergy_filter,
    ingredients: params.ingredients
  });
}

function getCachedResult(cacheKey) {
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('✅ Cache HIT:', cacheKey.substring(0, 50));
    return cached.data;
  }
  if (cached) {
    queryCache.delete(cacheKey); // Remove expired
  }
  return null;
}

function setCachedResult(cacheKey, data) {
  // Limit cache size to 50 entries
  if (queryCache.size >= 50) {
    const firstKey = queryCache.keys().next().value;
    queryCache.delete(firstKey);
  }
  queryCache.set(cacheKey, { data, timestamp: Date.now() });
}

// ============================================================================
// OPTIMIZATION: Build FilterExpression for DynamoDB-level filtering
// ============================================================================
function buildFilterExpression(params) {
  const expressions = [];
  const attributeValues = {};
  const attributeNames = {};

  // Title search
  if (params.title_prefix?.trim()) {
    expressions.push('contains(#title, :title)');
    attributeNames['#title'] = 'title';
    attributeValues[':title'] = params.title_prefix.trim().toLowerCase();
  }

  // Category filter
  if (params.category && params.category !== 'all') {
    expressions.push('contains(categories_csv, :category)');
    attributeValues[':category'] = params.category;
  }

  // Diet type filter (using habits_csv)
  if (params.diet_type && params.diet_type !== 'all') {
    expressions.push('contains(habits_csv, :diet)');
    attributeValues[':diet'] = params.diet_type;
  }

  // Allergy filter (using habits_csv)
  if (params.allergy_filter && params.allergy_filter !== 'all') {
    expressions.push('contains(habits_csv, :allergy)');
    attributeValues[':allergy'] = params.allergy_filter;
  }

  // Ingredients filter (word boundary matching done client-side in applyAllFilters)
  // Don't add to FilterExpression to avoid false positives

  if (expressions.length === 0) {
    return null;
  }

  return {
    FilterExpression: expressions.join(' AND '),
    ExpressionAttributeValues: attributeValues,
    ...(Object.keys(attributeNames).length > 0 && { ExpressionAttributeNames: attributeNames })
  };
}

// ============================================================================
// OPTIMIZATION: Parallel Scan (4 segments)
// ============================================================================
async function parallelScan(baseScanParams, segments = 4) {
  console.log(`🚀 Starting parallel scan with ${segments} segments`);
  const startTime = Date.now();

  const scanPromises = [];
  for (let segment = 0; segment < segments; segment++) {
    scanPromises.push(
      ddb.send(new ScanCommand({
        ...baseScanParams,
        Segment: segment,
        TotalSegments: segments
      }))
    );
  }

  const results = await Promise.all(scanPromises);

  // Combine all results
  const allItems = results.flatMap(r => r.Items || []);

  const duration = Date.now() - startTime;
  console.log(`✅ Parallel scan complete: ${allItems.length} items in ${duration}ms`);

  return allItems;
}

/**
 * Handle single recipe lookup by ID
 */
async function handleSingleRecipe(recipeId) {
  try {
    const cmd = new GetCommand({
      TableName: TABLE,
      Key: { recipe_id: recipeId }
    });

    const { Item } = await ddb.send(cmd);

    if (!Item) {
      return createResponse(404, { error: 'Recipe not found' });
    }

    const normalizedRecipes = normalizeRecipes([Item]);
    const recipe = normalizedRecipes[0];

    if (!recipe) {
      return createResponse(500, { error: 'Failed to process recipe data' });
    }

    return createResponse(200, recipe);
  } catch (error) {
    console.error('Error in handleSingleRecipe:', error);
    throw error;
  }
}

/**
 * Handle title search with filtering - OPTIMIZED
 */
async function handleTitleSearch(params) {
  const { title_prefix, limit, next_token } = params;

  if (!title_prefix?.trim()) {
    return createResponse(400, { error: 'title_prefix is required and cannot be empty' });
  }

  try {
    // Check cache first
    const cacheKey = getCacheKey(params);
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const resultLimit = validateLimit(limit, LIMITS.DEFAULT_LIMIT, LIMITS.MAX_LIMIT);

    // Build FilterExpression for DynamoDB-level filtering
    const filterConfig = buildFilterExpression(params);

    const baseScanParams = {
      TableName: TABLE,
      Limit: LIMITS.PAGE_LIMIT,
      ...filterConfig
    };

    // OPTIMIZATION: Use parallel scan (no pagination support for first release)
    const items = await parallelScan(baseScanParams, 4);
    const normalizedItems = normalizeRecipes(items);

    // Apply additional client-side filters (for complex logic like ingredients word boundary)
    const filteredItems = applyAllFilters(normalizedItems, params);

    // Remove duplicates
    const seenRecipeIds = new Set();
    const uniqueItems = filteredItems.filter(item => {
      if (seenRecipeIds.has(item.recipe_id)) {
        return false;
      }
      seenRecipeIds.add(item.recipe_id);
      return true;
    });

    // Return results
    const returnItems = uniqueItems.slice(0, resultLimit);
    const response = createPaginatedResponse(returnItems, returnItems.length, null);
    const result = createResponse(200, response);

    // Cache the result
    setCachedResult(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Error in handleTitleSearch:', error);
    throw error;
  }
}

/**
 * Handle category and other filter-based queries - OPTIMIZED
 */
async function handleFilteredQuery(params) {
  try {
    // Check cache first
    const cacheKey = getCacheKey(params);
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const { limit } = params;
    const resultLimit = validateLimit(limit, LIMITS.DEFAULT_LIMIT, LIMITS.MAX_LIMIT);

    // Build FilterExpression for DynamoDB-level filtering
    const filterConfig = buildFilterExpression(params);

    const baseScanParams = {
      TableName: TABLE,
      Limit: LIMITS.PAGE_LIMIT,
      ...filterConfig
    };

    // OPTIMIZATION: Use parallel scan
    const items = await parallelScan(baseScanParams, 4);
    const normalizedItems = normalizeRecipes(items);

    // Apply all client-side filters
    const filteredItems = applyAllFilters(normalizedItems, params);

    // Remove duplicates
    const seenRecipeIds = new Set();
    const uniqueItems = filteredItems.filter(item => {
      if (seenRecipeIds.has(item.recipe_id)) {
        return false;
      }
      seenRecipeIds.add(item.recipe_id);
      return true;
    });

    // Return results
    const returnItems = uniqueItems.slice(0, resultLimit);
    const response = createPaginatedResponse(returnItems, returnItems.length, null);
    const result = createResponse(200, response);

    // Cache the result
    setCachedResult(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Error in handleFilteredQuery:', error);
    throw error;
  }
}

/**
 * Handle general recipe browsing (no specific filters) - OPTIMIZED
 */
async function handleGeneralScan(params) {
  try {
    const { limit, next_token } = params;
    const resultLimit = validateLimit(limit, LIMITS.DEFAULT_LIMIT, LIMITS.MAX_LIMIT);
    const lastKey = parseNextToken(next_token);

    // For general browsing, use simple scan (not parallel, to support pagination)
    const scanParams = {
      TableName: TABLE,
      Limit: Math.min(resultLimit, LIMITS.MAX_LIMIT),
      ExclusiveStartKey: lastKey,
    };

    const data = await ddb.send(new ScanCommand(scanParams));
    const normalizedItems = normalizeRecipes(data.Items || []);

    // Remove duplicates
    const seenRecipeIds = new Set();
    const uniqueItems = normalizedItems.filter(item => {
      if (seenRecipeIds.has(item.recipe_id)) {
        return false;
      }
      seenRecipeIds.add(item.recipe_id);
      return true;
    });

    const nextToken = encodeNextToken(data.LastEvaluatedKey);
    const response = createPaginatedResponse(uniqueItems, uniqueItems.length, nextToken);

    return createResponse(200, response);
  } catch (error) {
    console.error('Error in handleGeneralScan:', error);
    throw error;
  }
}

/**
 * Handle facets request - return available filter options
 */
async function handleFacetsQuery() {
  try {
    const { VALID_CATEGORIES, VALID_HABITS, VALID_ALLERGY_FILTERS } = require('../config/constants');

    const facets = {
      categories: VALID_CATEGORIES.filter(cat => cat !== 'all'),
      diet_types: VALID_HABITS.filter(habit => habit !== 'all'),
      allergy_filters: VALID_ALLERGY_FILTERS.filter(filter => filter !== 'all'),
      habits: [...VALID_HABITS.filter(habit => habit !== 'all'), ...VALID_ALLERGY_FILTERS.filter(filter => filter !== 'all')]
    };

    return createResponse(200, facets);
  } catch (error) {
    console.error('Error in handleFacetsQuery:', error);
    throw error;
  }
}

module.exports = {
  handleSingleRecipe,
  handleTitleSearch,
  handleFilteredQuery,
  handleGeneralScan,
  handleFacetsQuery
};
