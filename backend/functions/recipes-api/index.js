// recipes-api Lambda handler - Modular Version
const { CORS_HEADERS } = require('./config/constants');
const { createResponse, createErrorResponse } = require('./lib/utils');
const { validateFilters, hasAnyFilter } = require('./lib/filterLogic');
const {
  handleSingleRecipe,
  handleTitleSearch,
  handleFilteredQuery,
  handleGeneralScan,
  handleFacetsQuery
} = require('./lib/queryHandlers');

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  // Handle OPTIONS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, '', CORS_HEADERS);
  }

  try {
    const params = event.queryStringParameters || {};
    const { recipe_id, title_prefix, limit, next_token, habit, category, diet_type, allergy_filter, ingredients } = params;

    // Validate filter parameters
    const validationErrors = validateFilters(params);
    if (validationErrors.length > 0) {
      return createResponse(400, {
        error: 'Invalid parameters',
        details: validationErrors
      });
    }

    // Route to appropriate handler based on request type

    // 1. Single recipe lookup
    if (recipe_id) {
      return await handleSingleRecipe(recipe_id);
    }

    // 2. Facets query (return available filter options)
    if (params.facets === 'true') {
      return await handleFacetsQuery();
    }

    // 3. Title search
    if (title_prefix) {
      return await handleTitleSearch(params);
    }

    // 4. Filter-based queries (category, habit, diet_type, allergy_filter)
    if (hasAnyFilter(params)) {
      return await handleFilteredQuery(params);
    }

    // 5. General browsing (no specific filters)
    return await handleGeneralScan(params);

  } catch (error) {
    return createErrorResponse(error, event);
  }
};

/**
 * Module exports for testing
 */
module.exports = {
  handler: exports.handler,
  // Export handlers for unit testing
  handleSingleRecipe,
  handleTitleSearch,
  handleFilteredQuery,
  handleGeneralScan,
  handleFacetsQuery
};