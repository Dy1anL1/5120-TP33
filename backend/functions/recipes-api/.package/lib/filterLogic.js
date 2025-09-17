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
    params.title_prefix
  );
}

/**
 * Validate filter parameters
 */
function validateFilters(params) {
  const errors = [];

  // Check for valid category values
  const validCategories = ['all', 'breakfast', 'lunch', 'dinner', 'dessert', 'soup', 'salad', 'snack', 'beverage'];
  if (params.category && !validCategories.includes(params.category)) {
    errors.push(`Invalid category: ${params.category}`);
  }

  // Check for valid diet types
  const validDietTypes = ['all', 'vegetarian', 'vegan', 'low_sugar', 'low_sodium', 'heart_healthy', 'diabetic_friendly', 'soft_food'];
  if (params.diet_type && !validDietTypes.includes(params.diet_type)) {
    errors.push(`Invalid diet_type: ${params.diet_type}`);
  }

  // Check for valid allergy filters
  const validAllergyFilters = ['all', 'dairy_free', 'gluten_free', 'nut_free', 'seafood_free', 'soy_free', 'fish_free', 'shellfish_free', 'egg_free'];
  if (params.allergy_filter && !validAllergyFilters.includes(params.allergy_filter)) {
    errors.push(`Invalid allergy_filter: ${params.allergy_filter}`);
  }

  return errors;
}

module.exports = {
  applyHabitFilter,
  applyCategoryFilter,
  applyDietTypeFilter,
  applyAllergyFilter,
  applyTitleFilter,
  applyAllFilters,
  hasAnyFilter,
  validateFilters
};