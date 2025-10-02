// Smart Shopping List JavaScript Implementation
// Epic 4.0: Shopping List Generator for Silver Spoon Society

// Configuration
const SHOPPING_LIST_KEY = 'shoppingList';
const MEAL_PLAN_KEY = 'weeklyMealPlan';
const MEAL_PLAN_INGREDIENTS_KEY = 'mealPlanIngredients';

// Global state
let shoppingList = {
    items: [],
    lastGenerated: null,
    source: 'meal-plan'
};

// Category definitions with emojis for senior-friendly interface
const CATEGORIES = {
    produce: {
        name: '🥕 Produce',
        keywords: ['tomato', 'onion', 'carrot', 'lettuce', 'spinach', 'pepper', 'cucumber', 'potato', 'apple', 'banana', 'lemon', 'lime', 'garlic', 'ginger', 'herbs', 'cilantro', 'parsley', 'basil', 'celery', 'broccoli', 'cauliflower', 'zucchini', 'mushroom', 'avocado', 'scallion', 'leek', 'kale', 'cabbage', 'corn', 'beans', 'peas']
    },
    meat: {
        name: '🥩 Meat & Seafood',
        keywords: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'turkey', 'bacon', 'ham', 'ground beef', 'steak', 'cod', 'tilapia', 'crab', 'lobster', 'scallop', 'lamb', 'duck', 'sausage']
    },
    dairy: {
        name: '🥛 Dairy & Eggs',
        keywords: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'sour cream', 'cottage cheese', 'mozzarella', 'cheddar', 'parmesan', 'feta', 'ricotta', 'heavy cream', 'whipped cream']
    },
    pantry: {
        name: '🥫 Pantry Items',
        keywords: ['rice', 'pasta', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'sauce', 'spice', 'honey', 'syrup', 'bean', 'lentil', 'oat', 'quinoa', 'stock', 'broth', 'canned', 'dried', 'soy sauce', 'sesame oil', 'coconut milk']
    },
    bakery: {
        name: '🍞 Bakery',
        keywords: ['bread', 'roll', 'bagel', 'muffin', 'croissant', 'pastry', 'cake', 'cookie', 'baguette', 'tortilla', 'pita']
    },
    frozen: {
        name: '🧊 Frozen Foods',
        keywords: ['frozen', 'ice cream', 'frozen vegetable', 'frozen fruit', 'frozen meal']
    },
    other: {
        name: '📦 Other',
        keywords: []
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    loadShoppingList();
    setupEventListeners();
    checkForMealPlanIngredients(); // Check for ingredients from meal planning
    renderShoppingList();
    setupMealPlanSync();
});

// Check for ingredients from meal planning page
function checkForMealPlanIngredients() {
    try {
        const mealPlanIngredients = localStorage.getItem(MEAL_PLAN_INGREDIENTS_KEY);
        if (mealPlanIngredients) {
            const ingredients = JSON.parse(mealPlanIngredients);
            // Auto-generate shopping list from these ingredients
            autoGenerateFromMealPlanIngredients(ingredients);

            // Clear the ingredients to prevent re-loading on page refresh
            localStorage.removeItem(MEAL_PLAN_INGREDIENTS_KEY);

            showNotification('Shopping list automatically generated from your meal plan!', 'success');
        }
    } catch (error) {
        console.error('Error checking for meal plan ingredients:', error);
    }
}

// Auto-generate shopping list from meal plan ingredients
function autoGenerateFromMealPlanIngredients(ingredients) {
    const items = [];

    ingredients.forEach(ingredient => {
        const cleanIngredient = cleanIngredientName(ingredient.name || ingredient);
        if (cleanIngredient) {
            items.push({
                id: generateItemId(),
                name: cleanIngredient,
                category: categorizeIngredient(cleanIngredient),
                completed: false,
                source: 'meal-plan',
                recipe: ingredient.recipe || 'Unknown Recipe',
                addedDate: new Date().toISOString()
            });
        }
    });

    // Remove duplicates and update list
    shoppingList.items = removeDuplicateItems(items);
    shoppingList.lastGenerated = new Date().toISOString();
    shoppingList.source = 'meal-plan';

    // Set the source selector to meal-plan
    document.getElementById('list-source').value = 'meal-plan';

    saveShoppingList();
}

// Setup automatic meal plan synchronization
function setupMealPlanSync() {
    // Check for meal plan changes every 5 seconds
    setInterval(() => {
        checkMealPlanChanges();
    }, 5000);

    // Listen for storage events (when meal plan is updated in another tab)
    window.addEventListener('storage', function (e) {
        if (e.key === MEAL_PLAN_KEY) {
            setTimeout(() => {
                autoUpdateFromMealPlan();
            }, 100); // Small delay to ensure storage is updated
        }
    });
}

// Check if meal plan has changed and auto-update if needed
async function checkMealPlanChanges() {
    const source = shoppingList.source;
    if (source === 'meal-plan' || source === 'both') {
        try {
            const mealPlan = localStorage.getItem(MEAL_PLAN_KEY);
            if (mealPlan) {
                const currentPlan = JSON.parse(mealPlan);
                const lastModified = currentPlan.lastModified || currentPlan.generatedAt;

                if (lastModified && (!shoppingList.lastMealPlanSync || new Date(lastModified) > new Date(shoppingList.lastMealPlanSync))) {
                    await autoUpdateFromMealPlan();
                }
            }
        } catch (error) {
            console.error('Error checking meal plan changes:', error);
        }
    }
}

// Auto-update shopping list from meal plan changes
async function autoUpdateFromMealPlan() {
    try {
        shoppingList.lastMealPlanSync = new Date().toISOString();
        await generateShoppingList();
        showNotification('Shopping list updated from meal plan changes', 'info');
    } catch (error) {
        console.error('Error auto-updating shopping list:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Generate list button
    document.getElementById('generate-btn').addEventListener('click', generateShoppingList);

    // Add custom item
    document.getElementById('add-item-btn').addEventListener('click', addCustomItem);
    document.getElementById('custom-item-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addCustomItem();
        }
    });

    // Clear completed items
    document.getElementById('clear-completed-btn').addEventListener('click', clearCompletedItems);

    // Clear all items
    document.getElementById('clear-all-btn').addEventListener('click', clearAllItems);

    // Select/deselect all items
    document.getElementById('select-all-btn').addEventListener('click', toggleSelectAll);

    // Print list
    // document.getElementById('print-list-btn').addEventListener('click', printShoppingList);

    // Source selector change
    document.getElementById('list-source').addEventListener('change', function (e) {
        shoppingList.source = e.target.value;
        saveShoppingList();
    });
}

// Load shopping list from localStorage
function loadShoppingList() {
    try {
        const saved = localStorage.getItem(SHOPPING_LIST_KEY);
        if (saved) {
            shoppingList = { ...shoppingList, ...JSON.parse(saved) };
        }

        // Set source selector
        document.getElementById('list-source').value = shoppingList.source;
    } catch (error) {
        console.error('Error loading shopping list:', error);
    }
}

// Save shopping list to localStorage
function saveShoppingList() {
    try {
        localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(shoppingList));
    } catch (error) {
        console.error('Error saving shopping list:', error);
    }
}

// Generate shopping list based on selected source
async function generateShoppingList() {
    const source = document.getElementById('list-source').value;
    const generateBtn = document.getElementById('generate-btn');

    // Show loading state
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    generateBtn.disabled = true;

    try {
        let newItems = [];

        if (source === 'meal-plan' || source === 'both') {
            const mealPlanItems = await generateFromMealPlan();
            newItems = newItems.concat(mealPlanItems);
        }

        if (source === 'custom' || source === 'both') {
            // Keep existing custom items if generating from both sources
            const existingCustomItems = shoppingList.items.filter(item => item.source === 'custom');
            if (source === 'both') {
                newItems = newItems.concat(existingCustomItems);
            } else {
                newItems = existingCustomItems;
            }
        }

        // Remove duplicates and update list
        shoppingList.items = removeDuplicateItems(newItems);
        shoppingList.lastGenerated = new Date().toISOString();
        shoppingList.source = source;

        saveShoppingList();
        renderShoppingList();

        // Show success message
        showNotification('Shopping list generated successfully!', 'success');

    } catch (error) {
        console.error('Error generating shopping list:', error);
        showNotification('Error generating shopping list. Please try again.', 'error');
    } finally {
        // Reset button
        generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate List';
        generateBtn.disabled = false;
    }
}

// Generate items from meal plan
async function generateFromMealPlan() {
    try {
        const mealPlan = localStorage.getItem(MEAL_PLAN_KEY);
        if (!mealPlan) {
            throw new Error('No meal plan found. Please create a meal plan first.');
        }

        const weeklyPlan = JSON.parse(mealPlan);
        const items = [];

        // Extract ingredients from each day's meals
        Object.values(weeklyPlan.plan).forEach(dayMeals => {
            Object.values(dayMeals).forEach(recipe => {
                if (recipe && recipe.ingredients) {
                    recipe.ingredients.forEach(ingredient => {
                        const cleanIngredient = cleanIngredientName(ingredient);
                        if (cleanIngredient) {
                            items.push({
                                id: generateItemId(),
                                name: cleanIngredient,
                                category: categorizeIngredient(cleanIngredient),
                                completed: false,
                                source: 'meal-plan',
                                recipe: recipe.title,
                                addedDate: new Date().toISOString()
                            });
                        }
                    });
                }
            });
        });

        return items;

    } catch (error) {
        console.error('Error generating from meal plan:', error);
        throw error;
    }
}

// Clean and normalize ingredient names with smart simplification
function cleanIngredientName(ingredient) {
    if (!ingredient || typeof ingredient !== 'string') return null;

    // Remove quantities and measurements
    let cleaned = ingredient
        .replace(/^\d+(\.\d+)?\s*(cup|cups|tablespoon|tablespoons|teaspoon|teaspoons|tbsp|tsp|lb|lbs|oz|ounce|ounces|pound|pounds|gram|grams|kg|kilogram|liter|ml|pint|quart|gallon)s?\s*/gi, '')
        .replace(/^\d+(\.\d+)?\s*/g, '') // Remove leading numbers
        .replace(/\s*\([^)]*\)/g, '') // Remove parenthetical notes
        .replace(/,.*$/g, '') // Remove everything after comma
        .trim();

    // Smart simplification
    cleaned = simplifyIngredientName(cleaned);

    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();

    return cleaned || null;
}

// Smart ingredient name simplification
function simplifyIngredientName(name) {
    const simplificationRules = [
        // Oil simplifications
        { pattern: /olive oil.*extra.*virgin|extra.*virgin.*olive oil/i, replacement: 'olive oil' },
        { pattern: /vegetable oil|canola oil|cooking oil/i, replacement: 'cooking oil' },

        // Meat simplifications
        { pattern: /ground beef.*lean|lean ground beef/i, replacement: 'ground beef' },
        { pattern: /chicken breast.*boneless|boneless.*chicken breast/i, replacement: 'chicken breast' },
        { pattern: /salmon fillet|salmon filet/i, replacement: 'salmon' },

        // Dairy simplifications
        { pattern: /heavy cream|heavy whipping cream/i, replacement: 'heavy cream' },
        { pattern: /unsalted butter|salted butter/i, replacement: 'butter' },

        // Produce simplifications
        { pattern: /yellow onion|white onion|sweet onion/i, replacement: 'onion' },
        { pattern: /roma tomato|vine tomato|fresh tomato/i, replacement: 'tomato' },
        { pattern: /fresh garlic|garlic clove/i, replacement: 'garlic' },

        // Pantry simplifications
        { pattern: /long grain rice|short grain rice|white rice/i, replacement: 'rice' },
        { pattern: /all-purpose flour|plain flour/i, replacement: 'flour' },
        { pattern: /kosher salt|sea salt|table salt/i, replacement: 'salt' },
        { pattern: /black pepper|ground black pepper/i, replacement: 'black pepper' }
    ];

    for (const rule of simplificationRules) {
        if (rule.pattern.test(name)) {
            return name.replace(rule.pattern, rule.replacement);
        }
    }

    return name;
}

// Categorize ingredient into shopping categories
function categorizeIngredient(ingredient) {
    const lowerIngredient = ingredient.toLowerCase();

    for (const [categoryKey, category] of Object.entries(CATEGORIES)) {
        if (category.keywords.some(keyword => lowerIngredient.includes(keyword))) {
            return categoryKey;
        }
    }

    return 'other';
}

// Parse quantity and unit from ingredient text
function parseQuantityFromIngredient(ingredientText) {
    const quantityPatterns = [
        // Numeric patterns with units
        { pattern: /(\d+(?:\.\d+)?(?:\s*\/\s*\d+)?)\s*(cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lb|lbs|pounds?|kg|kilograms?|g|grams?|ml|milliliters?|l|liters?)/gi, type: 'measured' },

        // Count patterns
        { pattern: /(\d+(?:\.\d+)?(?:\s*\/\s*\d+)?)\s*(large|medium|small|whole|cloves?|pieces?|slices?)/gi, type: 'count' },

        // Simple numbers
        { pattern: /^(\d+(?:\.\d+)?(?:\s*\/\s*\d+)?)\s+/g, type: 'number' }
    ];

    for (const { pattern, type } of quantityPatterns) {
        const match = pattern.exec(ingredientText);
        if (match) {
            let quantity = match[1];
            const unit = match[2] || '';

            // Convert fractions to decimals
            if (quantity.includes('/')) {
                const [num, den] = quantity.split('/').map(s => parseFloat(s.trim()));
                quantity = (num / den).toFixed(2);
            } else {
                quantity = parseFloat(quantity).toFixed(2);
            }

            return {
                quantity: parseFloat(quantity),
                unit: unit.toLowerCase(),
                type: type,
                originalText: match[0]
            };
        }
    }

    return null;
}

// Aggregate quantities for the same ingredient across recipes
function aggregateQuantities(quantities) {
    if (!quantities || quantities.length === 0) return null;

    // Group by unit type
    const unitGroups = {};
    quantities.forEach(q => {
        const unitKey = q.unit || 'count';
        if (!unitGroups[unitKey]) {
            unitGroups[unitKey] = [];
        }
        unitGroups[unitKey].push(q.quantity);
    });

    // Find the most common unit and sum quantities
    const bestUnit = Object.keys(unitGroups).reduce((a, b) =>
        unitGroups[a].length > unitGroups[b].length ? a : b
    );

    const totalQuantity = unitGroups[bestUnit].reduce((sum, q) => sum + q, 0);

    return {
        total: Math.round(totalQuantity * 100) / 100, // Round to 2 decimal places
        unit: bestUnit,
        count: unitGroups[bestUnit].length
    };
}

// Estimate shopping weight/package suggestions
function getShoppingSuggestion(itemName, aggregated, recipeCount) {
    const name = itemName.toLowerCase();

    // If we have weight units, convert and use them
    if (aggregated && ['lb', 'lbs', 'pounds', 'pound', 'kg', 'g', 'grams', 'oz', 'ounces'].includes(aggregated.unit)) {
        let weight = aggregated.total;
        let unit = aggregated.unit;

        // Convert imperial to metric
        if (['lb', 'lbs', 'pounds', 'pound'].includes(unit)) {
            weight = Math.round(weight * 453.592); // Convert pounds to grams
            unit = 'g';
        } else if (['oz', 'ounces'].includes(unit)) {
            weight = Math.round(weight * 28.3495); // Convert ounces to grams
            unit = 'g';
        }

        // Convert to more practical shopping units
        if (unit === 'g' && weight > 500) {
            weight = Math.round(weight / 1000 * 10) / 10;
            unit = 'kg';
        }

        return `${weight}${unit}`;
    }

    // Meat and protein estimates
    if (name.includes('chicken breast') || name.includes('chicken')) {
        return recipeCount > 2 ? '700g-1kg' : '500g';
    }
    if (name.includes('ground beef') || name.includes('beef')) {
        return recipeCount > 2 ? '1kg' : '500g';
    }
    if (name.includes('pork') || name.includes('ham')) {
        return recipeCount > 2 ? '700g-1kg' : '500g';
    }
    if (name.includes('salmon') || name.includes('fish') || name.includes('tuna')) {
        return recipeCount > 2 ? '700g' : '500g';
    }

    // Vegetables
    if (name.includes('onion')) {
        return recipeCount > 3 ? '2-3 medium' : '1-2 medium';
    }
    if (name.includes('tomato')) {
        return recipeCount > 2 ? '700g' : '500g';
    }
    if (name.includes('potato')) {
        return recipeCount > 2 ? '1.5kg' : '1kg';
    }
    if (name.includes('carrot')) {
        return recipeCount > 2 ? '1kg' : '500g';
    }
    if (name.includes('spinach') || name.includes('lettuce') || name.includes('kale')) {
        return recipeCount > 2 ? '2 bags' : '1 bag';
    }
    if (name.includes('broccoli') || name.includes('cauliflower')) {
        return recipeCount > 2 ? '2 heads' : '1 head';
    }

    // Pantry staples
    if (name.includes('rice')) {
        return recipeCount > 2 ? '1kg bag' : '500g bag';
    }
    if (name.includes('pasta')) {
        return recipeCount > 2 ? '1kg' : '500g box';
    }
    if (name.includes('flour')) {
        return recipeCount > 2 ? '2kg bag' : '1kg bag';
    }
    if (name.includes('sugar')) {
        return '1kg bag';
    }
    if (name.includes('olive oil') || name.includes('cooking oil')) {
        return '500ml bottle';
    }

    // Dairy
    if (name.includes('milk')) {
        return recipeCount > 2 ? '2L' : '1L';
    }
    if (name.includes('cheese')) {
        return recipeCount > 2 ? '500g' : '250g';
    }
    if (name.includes('butter')) {
        return '500g pack';
    }
    if (name.includes('eggs')) {
        return recipeCount > 3 ? '18 count' : '12 count';
    }
    if (name.includes('yogurt')) {
        return recipeCount > 2 ? 'large container' : 'medium container';
    }

    // Herbs and spices
    if (name.includes('garlic')) {
        return '1 bulb';
    }
    if (name.includes('ginger')) {
        return '1 piece';
    }
    if (name.includes('basil') || name.includes('parsley') || name.includes('cilantro')) {
        return '1 bunch';
    }

    // Beans and legumes
    if (name.includes('beans') || name.includes('lentils') || name.includes('chickpea')) {
        return recipeCount > 2 ? '2 cans' : '1 can';
    }

    // Default suggestion based on recipe count
    if (recipeCount > 3) {
        return 'large package';
    } else if (recipeCount > 1) {
        return 'medium package';
    } else {
        return 'small package';
    }
}

// Simplify ingredient names for better merging
function simplifyIngredientName(name) {
    const simplificationRules = [
        // Oil varieties
        { pattern: /olive oil.*extra.*virgin|extra.*virgin.*olive oil/i, replacement: 'olive oil' },
        { pattern: /vegetable oil|canola oil|sunflower oil/i, replacement: 'cooking oil' },

        // Meat varieties
        { pattern: /ground beef.*lean|lean ground beef/i, replacement: 'ground beef' },
        { pattern: /chicken breast.*boneless|boneless chicken breast/i, replacement: 'chicken breast' },
        { pattern: /pork shoulder|pork butt/i, replacement: 'pork shoulder' },

        // Rice varieties
        { pattern: /basmati rice|jasmine rice|long grain rice/i, replacement: 'rice' },
        { pattern: /brown rice|wild rice/i, replacement: 'rice' },

        // Onion varieties
        { pattern: /yellow onion|white onion|sweet onion/i, replacement: 'onion' },
        { pattern: /red onion/i, replacement: 'red onion' },
        { pattern: /green onion|scallion|spring onion/i, replacement: 'green onion' },

        // Tomato varieties
        { pattern: /roma tomato|cherry tomato|grape tomato/i, replacement: 'tomato' },
        { pattern: /canned tomato|crushed tomato|diced tomato/i, replacement: 'canned tomato' },

        // Salt varieties
        { pattern: /sea salt|kosher salt|table salt/i, replacement: 'salt' },

        // Pepper varieties
        { pattern: /black pepper|white pepper|ground pepper/i, replacement: 'pepper' },

        // Garlic forms
        { pattern: /garlic clove|fresh garlic|minced garlic/i, replacement: 'garlic' },

        // Flour types
        { pattern: /all[- ]?purpose flour|plain flour/i, replacement: 'flour' },
        { pattern: /bread flour|cake flour/i, replacement: 'flour' },

        // Milk types
        { pattern: /whole milk|2% milk|skim milk|low[- ]?fat milk/i, replacement: 'milk' },

        // Butter types
        { pattern: /unsalted butter|salted butter/i, replacement: 'butter' },

        // Remove quantity and measurement words
        { pattern: /\b(\d+(\.\d+)?)\s*(cups?|tbsp|tsp|oz|lb|kg|g|ml|l|tablespoons?|teaspoons?|ounces?|pounds?|grams?|kilograms?|milliliters?|liters?)\b/gi, replacement: '' },

        // Remove common descriptors
        { pattern: /\b(fresh|dried|frozen|canned|chopped|diced|sliced|minced|crushed|ground|whole|large|small|medium)\b/gi, replacement: '' },

        // Remove brands and specific varieties in parentheses
        { pattern: /\([^)]+\)/g, replacement: '' },

        // Clean up extra spaces
        { pattern: /\s+/g, replacement: ' ' }
    ];

    let simplified = name;
    simplificationRules.forEach(rule => {
        simplified = simplified.replace(rule.pattern, rule.replacement);
    });

    return simplified.trim();
}

// Remove duplicate items with smart merging and items marked as "have at home"
function removeDuplicateItems(items) {
    const haveAtHomeItems = getHaveAtHomeItems();
    const mergedItems = {};

    items.forEach(item => {
        // Parse quantity from original ingredient text (before simplification)
        const quantityInfo = parseQuantityFromIngredient(item.name);

        const simplifiedName = simplifyIngredientName(item.name);
        const normalizedName = simplifiedName.toLowerCase().trim();

        // Skip if already marked as "have at home"
        if (haveAtHomeItems.has(normalizedName)) {
            return;
        }

        if (mergedItems[normalizedName]) {
            // Merge with existing item
            const existing = mergedItems[normalizedName];

            // Combine recipe sources
            if (item.recipe && existing.recipe && item.recipe !== existing.recipe) {
                existing.recipeCount = (existing.recipeCount || 1) + 1;
                existing.recipes = existing.recipes || [existing.recipe];
                if (!existing.recipes.includes(item.recipe)) {
                    existing.recipes.push(item.recipe);
                }
            } else if (item.recipe && !existing.recipe) {
                existing.recipe = item.recipe;
                existing.recipeCount = (existing.recipeCount || 0) + 1;
            } else if (item.recipe) {
                existing.recipeCount = (existing.recipeCount || 1) + 1;
            }

            // Combine quantity information
            if (quantityInfo) {
                existing.quantities = existing.quantities || [];
                existing.quantities.push(quantityInfo);
            }

            // Keep the cleaner name (shorter is usually better)
            if (simplifiedName.length < existing.name.length) {
                existing.name = simplifiedName;
            }
        } else {
            // New item
            mergedItems[normalizedName] = {
                ...item,
                name: simplifiedName,
                recipeCount: item.recipe ? 1 : 0,
                recipes: item.recipe ? [item.recipe] : [],
                quantities: quantityInfo ? [quantityInfo] : []
            };
        }
    });

    return Object.values(mergedItems);
}

// Get items marked as "have at home"
function getHaveAtHomeItems() {
    const haveAtHomeItems = new Set();
    shoppingList.items.forEach(item => {
        if (item.haveAtHome) {
            haveAtHomeItems.add(item.name.toLowerCase().trim());
        }
    });
    return haveAtHomeItems;
}

// Add custom item
function addCustomItem() {
    const input = document.getElementById('custom-item-input');
    const categorySelect = document.getElementById('custom-category');

    const itemName = input.value.trim();
    if (!itemName) {
        showNotification('Please enter an item name', 'error');
        return;
    }

    const newItem = {
        id: generateItemId(),
        name: itemName,
        category: categorySelect.value,
        completed: false,
        source: 'custom',
        addedDate: new Date().toISOString()
    };

    shoppingList.items.push(newItem);
    saveShoppingList();
    renderShoppingList();

    // Clear input
    input.value = '';
    input.focus();

    showNotification('Item added successfully!', 'success');
}

// Toggle item completion
function toggleItemCompletion(itemId) {
    const item = shoppingList.items.find(item => item.id === itemId);
    if (item) {
        item.completed = !item.completed;
        item.completedDate = item.completed ? new Date().toISOString() : null;
        saveShoppingList();
        renderShoppingList();

        // Show appropriate feedback
        if (item.completed) {
            showNotification(`"${item.name}" marked as purchased`, 'success');
        }
    }
}

// Mark item as "Have at Home"
function markAsHaveAtHome(itemId) {
    const item = shoppingList.items.find(item => item.id === itemId);
    if (item) {
        item.haveAtHome = true;
        item.haveAtHomeDate = new Date().toISOString();
        saveShoppingList();
        renderShoppingList();
        showNotification(`"${item.name}" marked as already at home`, 'info');
    }
}

// Remove item
function removeItem(itemId) {
    shoppingList.items = shoppingList.items.filter(item => item.id !== itemId);
    saveShoppingList();
    renderShoppingList();
    showNotification('Item removed', 'success');
}

// Clear completed items
function clearCompletedItems() {
    const completedCount = shoppingList.items.filter(item => item.completed).length;

    if (completedCount === 0) {
        showNotification('No completed items to clear', 'info');
        return;
    }

    if (confirm(`Remove ${completedCount} completed item${completedCount > 1 ? 's' : ''}?`)) {
        shoppingList.items = shoppingList.items.filter(item => !item.completed);
        saveShoppingList();
        renderShoppingList();
        showNotification(`${completedCount} item${completedCount > 1 ? 's' : ''} removed`, 'success');
    }
}

// Clear all items
function clearAllItems() {
    const totalCount = shoppingList.items.length;

    if (totalCount === 0) {
        showNotification('Shopping list is already empty', 'info');
        return;
    }

    if (confirm(`Are you sure you want to remove all ${totalCount} item${totalCount > 1 ? 's' : ''} from your shopping list?`)) {
        shoppingList.items = [];
        saveShoppingList();
        renderShoppingList();
        showNotification('All items cleared from shopping list', 'success');
    }
}

// Toggle select/deselect all items
function toggleSelectAll() {
    if (shoppingList.items.length === 0) {
        showNotification('No items to select', 'info');
        return;
    }

    const allCompleted = shoppingList.items.every(item => item.completed);
    const newCompletedState = !allCompleted;

    shoppingList.items.forEach(item => {
        item.completed = newCompletedState;
    });

    saveShoppingList();
    renderShoppingList();

    const action = newCompletedState ? 'selected' : 'deselected';
    showNotification(`All items ${action}`, 'success');
}

// Clear all items in a specific category
function clearCategoryItems(category) {
    const categoryItems = shoppingList.items.filter(item => item.category === category);
    const itemCount = categoryItems.length;

    if (itemCount === 0) {
        showNotification(`No items in ${category} category`, 'info');
        return;
    }

    if (confirm(`Remove all ${itemCount} item${itemCount > 1 ? 's' : ''} from ${category} category?`)) {
        shoppingList.items = shoppingList.items.filter(item => item.category !== category);
        saveShoppingList();
        renderShoppingList();
        showNotification(`${itemCount} ${category} item${itemCount > 1 ? 's' : ''} removed`, 'success');
    }
}

// Select/deselect all items in a category
function toggleCategorySelection(category) {
    const categoryItems = shoppingList.items.filter(item => item.category === category);

    if (categoryItems.length === 0) {
        showNotification(`No items in ${category} category`, 'info');
        return;
    }

    const allCategoryCompleted = categoryItems.every(item => item.completed);
    const newCompletedState = !allCategoryCompleted;

    shoppingList.items.forEach(item => {
        if (item.category === category) {
            item.completed = newCompletedState;
        }
    });

    saveShoppingList();
    renderShoppingList();

    const action = newCompletedState ? 'selected' : 'deselected';
    showNotification(`All ${category} items ${action}`, 'success');
}

// Render shopping list
function renderShoppingList() {
    updateSummaryStats();

    if (shoppingList.items.length === 0) {
        showEmptyState();
        updateSelectAllButton(false);
        return;
    }

    hideEmptyState();
    renderCategorizedItems();
    updateSelectAllButton();
}

// Update the Select All button text based on current state
function updateSelectAllButton(hasItems = true) {
    const button = document.getElementById('select-all-btn');
    if (!button) return;

    if (!hasItems || shoppingList.items.length === 0) {
        button.innerHTML = '<i class="fas fa-check-square"></i> Select All';
        return;
    }

    const allCompleted = shoppingList.items.every(item => item.completed);
    if (allCompleted) {
        button.innerHTML = '<i class="fas fa-square"></i> Deselect All';
    } else {
        button.innerHTML = '<i class="fas fa-check-square"></i> Select All';
    }
}

// Update summary statistics
function updateSummaryStats() {
    // Only count items that need to be bought (not "have at home")
    const itemsToBuy = shoppingList.items.filter(item => !item.haveAtHome);
    const totalItems = itemsToBuy.length;
    const completedItems = itemsToBuy.filter(item => item.completed).length;
    const remainingItems = totalItems - completedItems;
    const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    document.getElementById('total-items').textContent = totalItems;
    document.getElementById('completed-items').textContent = completedItems;
    document.getElementById('remaining-items').textContent = remainingItems;
    document.getElementById('progress-percentage').textContent = `${progressPercentage}% Complete`;
    document.getElementById('shopping-progress').style.width = `${progressPercentage}%`;
}

// Show empty state
function showEmptyState() {
    document.getElementById('empty-state').style.display = 'block';
    document.getElementById('shopping-categories').style.display = 'none';
    document.querySelector('.list-summary').style.display = 'none';
}

// Hide empty state
function hideEmptyState() {
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('shopping-categories').style.display = 'block';
    document.querySelector('.list-summary').style.display = 'block';
}

// Render categorized items
function renderCategorizedItems() {
    const categoriesContainer = document.getElementById('shopping-categories');

    // Group items by category (only show items that need to be bought)
    const itemsByCategory = {};
    shoppingList.items.forEach(item => {
        // Only show items that are not marked as "have at home"
        if (!item.haveAtHome) {
            if (!itemsByCategory[item.category]) {
                itemsByCategory[item.category] = [];
            }
            itemsByCategory[item.category].push(item);
        }
    });

    // Sort categories by priority (optimized for supermarket route)
    const categoryOrder = ['produce', 'meat', 'dairy', 'pantry', 'bakery', 'frozen', 'other'];
    const sortedCategories = categoryOrder.filter(cat => itemsByCategory[cat]);

    categoriesContainer.innerHTML = sortedCategories.map(categoryKey => {
        const items = itemsByCategory[categoryKey];
        const categoryInfo = CATEGORIES[categoryKey];

        return `
            <div class="category-section">
                <div class="category-header">
                    <div class="category-info">
                        <h3 class="category-title">${categoryInfo.name}</h3>
                        <span class="category-count">${items.length}</span>
                    </div>
                    <div class="category-actions">
                        <button class="btn-small btn-outline" onclick="toggleCategorySelection('${categoryKey}')" title="Select/Deselect all ${categoryInfo.name} items">
                            <i class="fas fa-check-square"></i>
                        </button>
                        <button class="btn-small btn-danger" onclick="clearCategoryItems('${categoryKey}')" title="Remove all ${categoryInfo.name} items">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="category-items">
                    ${items.map(item => renderShoppingItem(item)).join('')}
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners to items
    addItemEventListeners();
}

// Render individual shopping item with enhanced display
function renderShoppingItem(item) {
    // Generate frequency stars
    const stars = '⭐'.repeat(Math.min(item.recipeCount || 0, 3));

    // Generate quantity info with shopping suggestions
    let quantityInfo = '';
    const recipeCount = item.recipeCount || 1;

    if (item.quantities && item.quantities.length > 0) {
        const aggregated = aggregateQuantities(item.quantities);
        if (aggregated) {
            let displayUnit = aggregated.unit;
            // Simplify unit names for display
            const unitMapping = {
                'tbsp': 'tbsp', 'tablespoons': 'tbsp', 'tablespoon': 'tbsp',
                'tsp': 'tsp', 'teaspoons': 'tsp', 'teaspoon': 'tsp',
                'cups': 'cups', 'cup': 'cups',
                'oz': 'oz', 'ounces': 'oz', 'ounce': 'oz',
                'lb': 'lbs', 'lbs': 'lbs', 'pounds': 'lbs', 'pound': 'lbs',
                'g': 'g', 'grams': 'g', 'gram': 'g',
                'kg': 'kg', 'kilograms': 'kg', 'kilogram': 'kg',
                'ml': 'ml', 'milliliters': 'ml',
                'l': 'L', 'liters': 'L', 'liter': 'L',
                'large': 'large', 'medium': 'medium', 'small': 'small',
                'cloves': 'cloves', 'clove': 'cloves',
                'pieces': 'pieces', 'piece': 'pieces'
            };
            displayUnit = unitMapping[displayUnit] || displayUnit;

            // Get shopping suggestion
            const shoppingSuggestion = getShoppingSuggestion(item.name, aggregated, recipeCount);

            quantityInfo = `<div class="item-quantity">
                <div class="recipe-amount">Recipe total: ~${aggregated.total} ${displayUnit}</div>
                <div class="shopping-suggestion">Suggest buying: ${shoppingSuggestion}</div>
            </div>`;
        }
    } else {
        // No specific quantities found, provide general shopping suggestion
        const shoppingSuggestion = getShoppingSuggestion(item.name, null, recipeCount);
        quantityInfo = `<div class="item-quantity">
            <div class="shopping-suggestion">Suggest buying: ${shoppingSuggestion}</div>
        </div>`;
    }

    // Generate source info
    let sourceInfo = '';
    if (item.source === 'meal-plan') {
        if (item.recipeCount > 1) {
            sourceInfo = `<div class="item-source">Used in ${item.recipeCount} recipes ${stars}</div>`;
        } else if (item.recipe) {
            sourceInfo = `<div class="item-source">From: ${item.recipe}</div>`;
        }
    } else {
        sourceInfo = `<div class="item-source">Custom item</div>`;
    }

    return `
        <div class="shopping-item ${item.completed ? 'completed' : ''}" data-item-id="${item.id}">
            <div class="item-checkbox ${item.completed ? 'checked' : ''}" onclick="toggleItemCompletion('${item.id}')">
                ${item.completed ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="item-details">
                <div class="item-name">
                    ${item.name}
                    ${stars ? `<span class="frequency-indicator">${stars}</span>` : ''}
                </div>
                ${quantityInfo}
                ${sourceInfo}
            </div>
            <div class="item-actions">
                <button class="item-action-btn have-at-home-btn" onclick="markAsHaveAtHome('${item.id}')" title="Mark as have at home">
                    <i class="fas fa-home"></i>
                </button>
                <button class="item-action-btn" onclick="removeItem('${item.id}')" title="Remove item">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Add event listeners to shopping items
function addItemEventListeners() {
    document.querySelectorAll('.shopping-item').forEach(item => {
        const itemId = item.dataset.itemId;

        // Click on item (not checkbox) to toggle completion
        item.addEventListener('click', function (e) {
            if (!e.target.closest('.item-checkbox') && !e.target.closest('.item-actions')) {
                toggleItemCompletion(itemId);
            }
        });
    });
}

// Print shopping list
function printShoppingList() {
    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleDateString();

    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Shopping List - Silver Spoon Society</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #2c3e50; border-bottom: 2px solid #e74c3c; padding-bottom: 10px; }
                .category { margin-bottom: 20px; }
                .category-title { background: #f8f9fa; padding: 10px; margin: 0; font-weight: bold; }
                .item { padding: 5px 10px; border-left: 3px solid #e9ecef; margin: 2px 0; }
                .completed { text-decoration: line-through; color: #6c757d; }
                .print-date { color: #6c757d; font-size: 0.9rem; }
            </style>
        </head>
        <body>
            <h1>🛒 Shopping List</h1>
            <p class="print-date">Generated on: ${currentDate}</p>
            ${generatePrintContent()}
        </body>
        </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// Generate print content
function generatePrintContent() {
    if (shoppingList.items.length === 0) {
        return '<p>No items in shopping list.</p>';
    }

    // Group items by category
    const itemsByCategory = {};
    shoppingList.items.forEach(item => {
        if (!itemsByCategory[item.category]) {
            itemsByCategory[item.category] = [];
        }
        itemsByCategory[item.category].push(item);
    });

    const categoryOrder = ['produce', 'dairy', 'meat', 'bakery', 'frozen', 'pantry', 'other'];
    const sortedCategories = categoryOrder.filter(cat => itemsByCategory[cat]);

    return sortedCategories.map(categoryKey => {
        const items = itemsByCategory[categoryKey];
        const categoryInfo = CATEGORIES[categoryKey];

        return `
            <div class="category">
                <h3 class="category-title">${categoryInfo.name}</h3>
                ${items.map(item =>
            `<div class="item ${item.completed ? 'completed' : ''}">☐ ${item.name}</div>`
        ).join('')}
            </div>
        `;
    }).join('');
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Generate unique item ID
function generateItemId() {
    return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Export functions for global access
window.toggleItemCompletion = toggleItemCompletion;
window.removeItem = removeItem;
window.markAsHaveAtHome = markAsHaveAtHome;