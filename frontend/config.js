// Shared API Configuration
// This file contains all API endpoints used across the application
// to ensure consistency and easy maintenance

// API Base URLs
const API_CONFIG = {
    // Recipes API - for fetching recipe data
    RECIPES_API: 'https://97xkjqjeuc.execute-api.ap-southeast-2.amazonaws.com/prod/recipes',

    // Nutrition API - for calculating nutrition information
    // Note: Using the original endpoint that worked before
    NUTRITION_API: 'https://0brixnxwq3.execute-api.ap-southeast-2.amazonaws.com/prod/match',

    // Storage keys for localStorage
    STORAGE_KEYS: {
        WEEKLY_MEAL_PLAN: 'weeklyMealPlan',
        MEAL_PLAN_PREFERENCES: 'mealPlanPreferences',
        RECIPE_CACHE: 'recipeCache'
    },

    // Fixed meal type order for consistent display
    MEAL_TYPE_ORDER: ['breakfast', 'brunch', 'lunch', 'dinner', 'snack', 'starter', 'main', 'side']
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}

// Make available globally for script files
window.API_CONFIG = API_CONFIG;