// Filter logic for recipe queries

/**
 * Apply habit filter to recipes
 */
function applyHabitFilter(recipes, habit) {
  if (!habit || habit === 'all') return recipes;

  return recipes.filter(recipe =>
    recipe &&
    Array.isArray(recipe.habits) &&
    recipe.habits.includes(habit)
  );
}

/**
 * Apply category filter to recipes
 */
function applyCategoryFilter(recipes, category) {
  if (!category || category === 'all') return recipes;

  return recipes.filter(recipe =>
    recipe &&
    Array.isArray(recipe.categories) &&
    recipe.categories.includes(category)
  );
}

/**
 * Apply diet type filter to recipes
 */
function applyDietTypeFilter(recipes, dietType) {
  if (!dietType || dietType === 'all') return recipes;

  return recipes.filter(recipe =>
    recipe &&
    Array.isArray(recipe.habits) &&
    recipe.habits.includes(dietType)
  );
}

/**
 * Apply allergy filter to recipes
 */
function applyAllergyFilter(recipes, allergyFilter) {
  if (!allergyFilter || allergyFilter === 'all') return recipes;

  return recipes.filter(recipe =>
    recipe &&
    Array.isArray(recipe.habits) &&
    recipe.habits.includes(allergyFilter)
  );
}

/**
 * Apply title search filter to recipes
 */
function applyTitleFilter(recipes, titlePrefix) {
  if (!titlePrefix) return recipes;

  const prefix = titlePrefix.toLowerCase();
  return recipes.filter(recipe =>
    recipe &&
    recipe.title &&
    recipe.title.toLowerCase().includes(prefix)
  );
}

/**
 * Apply ingredients filter to recipes
 * Filters recipes that contain ANY of the specified ingredients
 * Uses word boundary matching to avoid false matches (e.g., "apple" shouldn't match "applewood")
 */
function applyIngredientsFilter(recipes, ingredientsParam) {
  if (!ingredientsParam) return recipes;

  // Parse comma-separated ingredients list
  const searchIngredients = ingredientsParam
    .toLowerCase()
    .split(',')
    .map(ing => ing.trim())
    .filter(ing => ing.length > 0);

  if (searchIngredients.length === 0) return recipes;

  return recipes.filter(recipe => {
    if (!recipe || !Array.isArray(recipe.ingredients)) return false;

    // Check if recipe contains any of the search ingredients
    return recipe.ingredients.some(recipeIng => {
      if (!recipeIng || typeof recipeIng !== 'string') return false;
      const recipeIngLower = recipeIng.toLowerCase();

      // Check if any search ingredient is found as a complete word
      return searchIngredients.some(searchIng => {
        // Create regex with word boundaries: \b ensures we match whole words
        // For multi-word ingredients like "red cabbage", we check if it appears as a phrase
        const regex = new RegExp(`\\b${searchIng.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(recipeIngLower);
      });
    });
  });
}

/**
 * Apply all filters to a list of recipes
 */
function applyAllFilters(recipes, filters = {}) {
  let filteredRecipes = recipes;

  // Apply each filter in sequence
  if (filters.habit) {
    filteredRecipes = applyHabitFilter(filteredRecipes, filters.habit);
  }

  if (filters.category) {
    filteredRecipes = applyCategoryFilter(filteredRecipes, filters.category);
  }

  if (filters.diet_type) {
    filteredRecipes = applyDietTypeFilter(filteredRecipes, filters.diet_type);
  }

  if (filters.allergy_filter) {
    filteredRecipes = applyAllergyFilter(filteredRecipes, filters.allergy_filter);
  }

  if (filters.title_prefix) {
    filteredRecipes = applyTitleFilter(filteredRecipes, filters.title_prefix);
  }

  if (filters.ingredients) {
    filteredRecipes = applyIngredientsFilter(filteredRecipes, filters.ingredients);
  }

  return filteredRecipes;
}

/**
 * Check if any filter parameters are provided
 */
function hasAnyFilter(params) {
  return !!(
    params.habit ||
    params.category ||
    params.diet_type ||
    params.allergy_filter ||
    params.title_prefix ||
    params.ingredients
  );
}

/**
 * Validate filter parameters
 */
function validateFilters(params) {
  const { VALID_CATEGORIES, VALID_HABITS, VALID_ALLERGY_FILTERS } = require('../config/constants');
  const errors = [];

  // Check for valid category values
  if (params.category && !VALID_CATEGORIES.includes(params.category)) {
    errors.push(`Invalid category: ${params.category}. Valid options: ${VALID_CATEGORIES.join(', ')}`);
  }

  // Check for valid diet types (habits)
  if (params.diet_type && !VALID_HABITS.includes(params.diet_type)) {
    errors.push(`Invalid diet_type: ${params.diet_type}. Valid options: ${VALID_HABITS.join(', ')}`);
  }

  // Check for valid allergy filters
  if (params.allergy_filter && !VALID_ALLERGY_FILTERS.includes(params.allergy_filter)) {
    errors.push(`Invalid allergy_filter: ${params.allergy_filter}. Valid options: ${VALID_ALLERGY_FILTERS.join(', ')}`);
  }

  return errors;
}

module.exports = {
  applyHabitFilter,
  applyCategoryFilter,
  applyDietTypeFilter,
  applyAllergyFilter,
  applyTitleFilter,
  applyIngredientsFilter,
  applyAllFilters,
  hasAnyFilter,
  validateFilters
};