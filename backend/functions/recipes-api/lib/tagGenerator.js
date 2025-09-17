// Tag generation utilities for recipes
const { DIET_TAGS, CATEGORY_KEYWORDS } = require('../config/constants');
const { hasAny } = require('./utils');

/**
 * Create text bag from recipe for analysis
 */
function textBag(recipe) {
  if (!recipe || typeof recipe !== 'object') {
    console.warn('textBag: received null or invalid recipe');
    return '';
  }

  const parts = [];
  try {
    if (recipe.title) parts.push(String(recipe.title));
    if (Array.isArray(recipe.ingredients)) {
      parts.push(...recipe.ingredients.filter(i => i != null).map(String));
    }
    const ner = Array.isArray(recipe.NER) ? recipe.NER : Array.isArray(recipe.ner) ? recipe.ner : [];
    parts.push(...ner.filter(n => n != null).map(String));
    return parts.join(" ").toLowerCase();
  } catch (error) {
    console.error('Error in textBag:', error.message);
    return '';
  }
}

/**
 * Generate habit tags based on ingredients and content
 */
function getHabits(recipe) {
  if (!recipe) return [];
  const txt = textBag(recipe);

  const tags = new Set();
  const hasMeat = hasAny(txt, DIET_TAGS.MEAT);
  const hasDairy = hasAny(txt, DIET_TAGS.DAIRY);
  const hasEggs = hasAny(txt, DIET_TAGS.EGGS);
  const hasGluten = hasAny(txt, DIET_TAGS.GLUTEN);
  const hasNuts = hasAny(txt, DIET_TAGS.NUTS);
  const hasSugar = hasAny(txt, DIET_TAGS.SUGAR);
  const hasSeafood = hasAny(txt, DIET_TAGS.SEAFOOD);
  const hasSoy = hasAny(txt, DIET_TAGS.SOY);

  // Diet tags
  if (!hasMeat) {
    tags.add("vegetarian");
    if (!hasDairy && !hasEggs && !txt.includes("honey")) tags.add("vegan");
  }

  // Allergy-free tags
  if (!hasDairy) tags.add("dairy_free");
  if (!hasEggs) tags.add("egg_free");
  if (!hasGluten) tags.add("gluten_free");
  if (!hasNuts) tags.add("nut_free");
  if (!hasSeafood) tags.add("seafood_free");
  if (!hasSoy) tags.add("soy_free");
  if (!hasSugar) tags.add("low_sugar");

  // More specific seafood tags
  const fishKeywords = ["fish", "salmon", "tuna", "cod", "bass", "tilapia"];
  const shellfishKeywords = ["shrimp", "crab", "lobster", "shellfish"];

  if (!hasAny(txt, fishKeywords)) tags.add("fish_free");
  if (!hasAny(txt, shellfishKeywords)) tags.add("shellfish_free");

  // Soft food detection
  if (hasAny(txt, CATEGORY_KEYWORDS.SOFT_FOOD)) {
    tags.add("soft_food");
  }

  // Contains tags
  if (hasMeat) tags.add("contains_meat");
  if (hasDairy) tags.add("contains_dairy");
  if (hasEggs) tags.add("contains_eggs");
  if (hasGluten) tags.add("contains_gluten");
  if (hasNuts) tags.add("contains_nuts");
  if (hasSeafood) tags.add("contains_seafood");
  if (hasSoy) tags.add("contains_soy");

  // Health tags based on basic ingredient analysis
  // These could be enhanced with actual nutrition data
  tags.add("low_sodium");
  tags.add("diabetic_friendly");
  tags.add("heart_healthy");

  return Array.from(tags);
}

/**
 * Generate category tags based on title and ingredients
 */
function getCategories(recipe) {
  if (!recipe) return [];
  const txt = textBag(recipe);
  const cat = new Set();

  if (hasAny(txt, CATEGORY_KEYWORDS.DESSERT)) cat.add("dessert");
  if (hasAny(txt, CATEGORY_KEYWORDS.SOUP)) cat.add("soup");
  if (hasAny(txt, CATEGORY_KEYWORDS.SALAD)) cat.add("salad");
  if (hasAny(txt, CATEGORY_KEYWORDS.BEVERAGE)) cat.add("beverage");
  if (hasAny(txt, CATEGORY_KEYWORDS.BREAKFAST)) cat.add("breakfast");
  if (hasAny(txt, CATEGORY_KEYWORDS.SNACK)) cat.add("snack");

  if (hasAny(txt, CATEGORY_KEYWORDS.MAIN_DISH)) {
    cat.add("lunch");
    cat.add("dinner");
  }

  if (cat.size === 0) cat.add("dinner");
  return Array.from(cat);
}

/**
 * Get all available habit tags in the system
 */
function getAllAvailableHabits() {
  return [
    'vegetarian', 'vegan',
    'dairy_free', 'egg_free', 'gluten_free', 'nut_free', 'seafood_free', 'soy_free', 'fish_free', 'shellfish_free',
    'contains_meat', 'contains_dairy', 'contains_eggs', 'contains_gluten', 'contains_nuts', 'contains_seafood', 'contains_soy',
    'low_sugar', 'low_sodium', 'diabetic_friendly', 'heart_healthy', 'soft_food'
  ];
}

/**
 * Get all available categories in the system
 */
function getAllAvailableCategories() {
  return ['breakfast', 'lunch', 'dinner', 'dessert', 'soup', 'salad', 'snack', 'beverage'];
}

module.exports = {
  textBag,
  getHabits,
  getCategories,
  getAllAvailableHabits,
  getAllAvailableCategories
};