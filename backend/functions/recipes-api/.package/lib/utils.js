// Utility functions for recipes-api

/**
 * Safe JSON parsing for next_token
 */
function parseNextToken(nextToken) {
  if (!nextToken) return undefined;

  try {
    return JSON.parse(Buffer.from(nextToken, 'base64').toString());
  } catch (e) {
    console.warn('Invalid next_token, ignoring:', e.message);
    return undefined;
  }
}

/**
 * Encode lastKey to base64 next_token
 */
function encodeNextToken(lastKey) {
  if (!lastKey) return undefined;
  return Buffer.from(JSON.stringify(lastKey)).toString('base64');
}

/**
 * Check if text contains any of the given words (case insensitive)
 */
function hasAny(text, words) {
  if (!text || !Array.isArray(words)) return false;
  const lowerText = text.toLowerCase();
  return words.some(word => lowerText.includes(word.toLowerCase()));
}

/**
 * Create standardized API response
 */
function createResponse(statusCode, data, headers = {}) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token',
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(data)
  };
}

/**
 * Create error response with detailed logging
 */
function createErrorResponse(error, event = null) {
  console.error('API Error:', error.message);
  console.error('Stack trace:', error.stack);
  if (event) {
    console.error('Event data:', JSON.stringify(event, null, 2));
  }

  return createResponse(500, {
    error: error.message,
    type: error.constructor.name
  });
}

/**
 * Validate and normalize limit parameter
 */
function validateLimit(limit, defaultLimit = 10, maxLimit = 50) {
  if (!limit) return defaultLimit;

  const numLimit = Number(limit);
  if (isNaN(numLimit) || numLimit <= 0) return defaultLimit;

  return Math.min(numLimit, maxLimit);
}

/**
 * Filter null/undefined items from array
 */
function filterValidItems(items) {
  return (items || []).filter(item => item !== null && item !== undefined);
}

/**
 * Create paginated response
 */
function createPaginatedResponse(items, totalCount, nextToken = null) {
  return {
    items: filterValidItems(items),
    count: totalCount,
    next_token: nextToken
  };
}

module.exports = {
  parseNextToken,
  encodeNextToken,
  hasAny,
  createResponse,
  createErrorResponse,
  validateLimit,
  filterValidItems,
  createPaginatedResponse
};