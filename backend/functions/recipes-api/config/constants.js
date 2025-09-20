// Configuration constants for recipes-api

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const TABLE = process.env.RECIPES_TABLE || 'Recipes_i2';
const GSI_TITLE_PREFIX = 'gsi_title_prefix';

// API limits and timeouts
const LIMITS = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
  MAX_SCAN_ITEMS: 5000,
  PAGE_LIMIT: 100
};

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token',
  'Content-Type': 'application/json'
};

// Valid filter options based on actual data in recipes_processed.json
const VALID_CATEGORIES = [
  'all', 'breakfast', 'lunch', 'dinner', 'brunch', 'snack', 'side', 'starter', 'main'
];

// Diet and lifestyle habits (excluding allergy filters)
const VALID_HABITS = [
  'all', 'vegetarian', 'vegan', 'keto', 'pescatarian', 'kosher', 'raw', 'low_sugar', 'low_sodium', 'healthyish'
];

// Allergy-specific filters (both old uppercase and new lowercase formats)
const VALID_ALLERGY_FILTERS = [
  'all', 'dairy_free', 'gluten_free', 'nut_free', 'soy_free', 'egg_free', 'fish_free', 'shellfish_free'
];

module.exports = {
  REGION,
  TABLE,
  GSI_TITLE_PREFIX,
  LIMITS,
  CORS_HEADERS,
  VALID_CATEGORIES,
  VALID_HABITS,
  VALID_ALLERGY_FILTERS
};