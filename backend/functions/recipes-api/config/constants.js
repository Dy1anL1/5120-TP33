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

// Diet and allergy tag definitions
const DIET_TAGS = {
  MEAT: ["meat", "chicken", "beef", "pork", "bacon", "lamb", "ham", "turkey", "fish", "tuna", "salmon", "shrimp", "anchovy", "gelatin"],
  DAIRY: ["milk", "cheese", "butter", "cream", "yogurt", "whey", "ghee"],
  EGGS: ["egg", "eggs", "albumen", "mayonnaise"],
  GLUTEN: ["wheat", "flour", "bread", "pasta", "noodle", "semolina", "barley", "rye", "cracker", "beer"],
  NUTS: ["peanut", "almond", "walnut", "pecan", "cashew", "hazelnut", "pistachio", "macadamia"],
  SUGAR: ["sugar", "syrup", "honey", "molasses", "fructose", "glucose", "corn syrup"],
  SEAFOOD: ["fish", "salmon", "tuna", "cod", "bass", "tilapia", "shrimp", "crab", "lobster", "shellfish"],
  SOY: ["soy", "soy sauce", "tofu", "tempeh", "miso", "edamame"]
};

// Category keywords
const CATEGORY_KEYWORDS = {
  DESSERT: ["cake", "cookie", "brownie", "pie", "pudding", "mousse", "tart", "frosting"],
  SOUP: ["soup", "broth", "chowder", "bisque"],
  SALAD: ["salad"],
  DRINK: ["smoothie", "juice", "latte", "milkshake", "punch", "lemonade", "drink"],
  BREAKFAST: ["pancake", "waffle", "oatmeal", "cereal", "muffin", "granola", "omelet", "breakfast", "toast", "bagel", "eggs", "brunch"],
  SNACK: ["dip", "nacho", "popcorn", "bar"],
  MAIN_DISH: ["casserole", "stew", "roast", "pasta", "rice", "noodle", "chicken", "beef", "pork", "fish"],
  SOFT_FOOD: ["soup", "puree", "mashed", "smooth", "creamy", "soft", "yogurt", "pudding"]
};

module.exports = {
  REGION,
  TABLE,
  GSI_TITLE_PREFIX,
  LIMITS,
  CORS_HEADERS,
  DIET_TAGS,
  CATEGORY_KEYWORDS
};