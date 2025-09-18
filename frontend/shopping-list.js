// Smart Shopping List JavaScript Implementation
// Epic 4.0: Shopping List Generator for Silver Spoon Society

// Configuration
const SHOPPING_LIST_KEY = 'shoppingList';
const MEAL_PLAN_KEY = 'weeklyMealPlan';

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
        keywords: ['tomato', 'onion', 'carrot', 'lettuce', 'spinach', 'pepper', 'cucumber', 'potato', 'apple', 'banana', 'lemon', 'lime', 'garlic', 'ginger', 'herbs', 'cilantro', 'parsley', 'basil', 'celery', 'broccoli', 'cauliflower', 'zucchini', 'mushroom', 'avocado']
    },
    dairy: {
        name: '🥛 Dairy & Eggs',
        keywords: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'sour cream', 'cottage cheese', 'mozzarella', 'cheddar', 'parmesan', 'feta', 'ricotta']
    },
    meat: {
        name: '🥩 Meat & Seafood',
        keywords: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'turkey', 'bacon', 'ham', 'ground beef', 'steak', 'cod', 'tilapia']
    },
    pantry: {
        name: '🥫 Pantry Items',
        keywords: ['rice', 'pasta', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'sauce', 'spice', 'honey', 'syrup', 'bean', 'lentil', 'oat', 'quinoa', 'stock', 'broth', 'canned', 'dried']
    },
    frozen: {
        name: '🧊 Frozen Foods',
        keywords: ['frozen', 'ice cream', 'frozen vegetable', 'frozen fruit', 'frozen meal']
    },
    bakery: {
        name: '🍞 Bakery',
        keywords: ['bread', 'roll', 'bagel', 'muffin', 'croissant', 'pastry', 'cake', 'cookie']
    },
    other: {
        name: '📦 Other',
        keywords: []
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Shopping List initialized');
    loadShoppingList();
    setupEventListeners();
    renderShoppingList();
    setupMealPlanSync();
});

// Setup automatic meal plan synchronization
function setupMealPlanSync() {
    // Check for meal plan changes every 5 seconds
    setInterval(() => {
        checkMealPlanChanges();
    }, 5000);

    // Listen for storage events (when meal plan is updated in another tab)
    window.addEventListener('storage', function(e) {
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
    document.getElementById('custom-item-input').addEventListener('keypress', function(e) {
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
    document.getElementById('list-source').addEventListener('change', function(e) {
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

// Clean and normalize ingredient names
function cleanIngredientName(ingredient) {
    if (!ingredient || typeof ingredient !== 'string') return null;
    
    // Remove quantities and measurements
    let cleaned = ingredient
        .replace(/^\d+(\.\d+)?\s*(cup|cups|tablespoon|tablespoons|teaspoon|teaspoons|tbsp|tsp|lb|lbs|oz|ounce|ounces|pound|pounds|gram|grams|kg|kilogram|liter|ml|pint|quart|gallon)s?\s*/gi, '')
        .replace(/^\d+(\.\d+)?\s*/g, '') // Remove leading numbers
        .replace(/\s*\([^)]*\)/g, '') // Remove parenthetical notes
        .replace(/,.*$/g, '') // Remove everything after comma
        .trim();
    
    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    
    return cleaned || null;
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

// Remove duplicate items and items marked as "have at home"
function removeDuplicateItems(items) {
    const seen = new Set();
    const haveAtHomeItems = getHaveAtHomeItems();

    return items.filter(item => {
        const key = item.name.toLowerCase().trim();

        // Skip if already seen (duplicate)
        if (seen.has(key)) {
            return false;
        }

        // Skip if marked as "have at home"
        if (haveAtHomeItems.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
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
    
    // Sort categories by priority
    const categoryOrder = ['produce', 'dairy', 'meat', 'bakery', 'frozen', 'pantry', 'other'];
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

// Render individual shopping item
function renderShoppingItem(item) {
    return `
        <div class="shopping-item ${item.completed ? 'completed' : ''}" data-item-id="${item.id}">
            <div class="item-checkbox ${item.completed ? 'checked' : ''}" onclick="toggleItemCompletion('${item.id}')">
                ${item.completed ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="item-details">
                <div class="item-name">${item.name}</div>
                ${item.source === 'meal-plan' && item.recipe ?
                    `<div class="item-source">From: ${item.recipe}</div>` :
                    `<div class="item-source">Custom item</div>`
                }
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
        item.addEventListener('click', function(e) {
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
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s ease;
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