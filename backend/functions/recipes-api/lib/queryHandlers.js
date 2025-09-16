// Query handlers for different types of recipe requests
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { TABLE, LIMITS } = require('../config/constants');
const { normalizeRecipes } = require('./dataProcessor');
const { applyAllFilters } = require('./filterLogic');
const { parseNextToken, encodeNextToken, validateLimit, createResponse, createPaginatedResponse } = require('./utils');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const ddb = DynamoDBDocumentClient.from(client);

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
 * Handle title search with filtering
 */
async function handleTitleSearch(params) {
  const { title_prefix, limit, next_token } = params;

  if (!title_prefix?.trim()) {
    return createResponse(400, { error: 'title_prefix is required and cannot be empty' });
  }

  try {
    const resultLimit = validateLimit(limit, LIMITS.DEFAULT_LIMIT, LIMITS.MAX_LIMIT);
    const lastKey = parseNextToken(next_token);

    let items = [];
    let scanned = 0;
    let nextTokenResult = undefined;

    // Use scan since GSI is not populated
    while (items.length < resultLimit && scanned < LIMITS.MAX_SCAN_ITEMS) {
      const scanParams = {
        TableName: TABLE,
        Limit: LIMITS.PAGE_LIMIT,
        ExclusiveStartKey: lastKey,
      };

      const data = await ddb.send(new ScanCommand(scanParams));
      const normalizedItems = normalizeRecipes(data.Items || []);

      // Apply all filters including title search
      const filteredItems = applyAllFilters(normalizedItems, params);

      items = items.concat(filteredItems);
      scanned += (data.Items || []).length;

      if (!data.LastEvaluatedKey) break;
      nextTokenResult = encodeNextToken(data.LastEvaluatedKey);
    }

    // Return results with pagination
    if (items.length >= resultLimit && nextTokenResult) {
      const response = createPaginatedResponse(
        items.slice(0, resultLimit),
        resultLimit,
        nextTokenResult
      );
      return createResponse(200, response);
    } else {
      const response = createPaginatedResponse(items, items.length, null);
      return createResponse(200, response);
    }
  } catch (error) {
    console.error('Error in handleTitleSearch:', error);
    throw error;
  }
}

/**
 * Handle category and other filter-based queries
 */
async function handleFilteredQuery(params) {
  try {
    const { limit, next_token } = params;
    const resultLimit = validateLimit(limit, LIMITS.DEFAULT_LIMIT, LIMITS.MAX_LIMIT);
    const lastKey = parseNextToken(next_token);

    let items = [];
    let scanned = 0;
    let nextTokenResult = undefined;

    // Scan with filters
    while (items.length < resultLimit && scanned < LIMITS.MAX_SCAN_ITEMS) {
      const scanParams = {
        TableName: TABLE,
        Limit: LIMITS.PAGE_LIMIT,
        ExclusiveStartKey: lastKey,
      };

      const data = await ddb.send(new ScanCommand(scanParams));
      const normalizedItems = normalizeRecipes(data.Items || []);

      // Apply all filters
      const filteredItems = applyAllFilters(normalizedItems, params);

      items = items.concat(filteredItems);
      scanned += (data.Items || []).length;

      if (!data.LastEvaluatedKey) break;
      nextTokenResult = encodeNextToken(data.LastEvaluatedKey);
    }

    // Return results with pagination
    if (items.length >= resultLimit && nextTokenResult) {
      const response = createPaginatedResponse(
        items.slice(0, resultLimit),
        resultLimit,
        nextTokenResult
      );
      return createResponse(200, response);
    } else {
      const response = createPaginatedResponse(items, items.length, null);
      return createResponse(200, response);
    }
  } catch (error) {
    console.error('Error in handleFilteredQuery:', error);
    throw error;
  }
}

/**
 * Handle general recipe browsing (no specific filters)
 */
async function handleGeneralScan(params) {
  try {
    const { limit, next_token } = params;
    const resultLimit = validateLimit(limit, LIMITS.DEFAULT_LIMIT, LIMITS.MAX_LIMIT);
    const lastKey = parseNextToken(next_token);

    // Simple scan with limit to prevent timeout
    const scanParams = {
      TableName: TABLE,
      Limit: Math.min(resultLimit, LIMITS.MAX_LIMIT), // Cap at max limit to prevent timeout
      ExclusiveStartKey: lastKey,
    };

    const data = await ddb.send(new ScanCommand(scanParams));
    const normalizedItems = normalizeRecipes(data.Items || []);

    const nextToken = encodeNextToken(data.LastEvaluatedKey);
    const response = createPaginatedResponse(normalizedItems, normalizedItems.length, nextToken);

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
    const facets = {
      categories: ['breakfast', 'lunch', 'dinner', 'dessert', 'soup', 'salad', 'snack', 'drink'],
      diet_types: ['vegetarian', 'vegan', 'low_sugar', 'low_sodium', 'heart_healthy', 'diabetic_friendly', 'soft_food'],
      allergy_filters: ['dairy_free', 'gluten_free', 'nut_free', 'seafood_free', 'soy_free', 'fish_free', 'shellfish_free', 'egg_free'],
      habits: ['vegetarian', 'vegan', 'dairy_free', 'egg_free', 'gluten_free', 'nut_free', 'seafood_free', 'soy_free', 'fish_free', 'shellfish_free', 'contains_meat', 'contains_dairy', 'contains_eggs', 'contains_gluten', 'contains_nuts', 'contains_seafood', 'contains_soy', 'low_sugar', 'low_sodium', 'diabetic_friendly', 'heart_healthy', 'soft_food']
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