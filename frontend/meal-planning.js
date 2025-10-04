// Weekly Meal Plan JavaScript Implementation
// Designed for users aged 55-65 with comprehensive preference questionnaire

// Configuration
// Note: API endpoints and other configs are now defined in config.js

// Global state
let currentStep = 1;
let userPreferences = {};
let weeklyPlan = null;

// Cache for nutrition calculations
const nutritionCache = new Map();

// Rate limiting for API requests
let lastNutritionRequest = 0;
const NUTRITION_REQUEST_DELAY = 100; // 100ms delay between requests

// Get consistent nutrition data (same logic as modal)
async function getConsistentNutrition(recipe) {
    let nutrition = recipe.nutrition;

    // If no meaningful nutrition data (all zeros except maybe sodium), calculate it from ingredients
    const hasValidNutrition = nutrition && (
        (nutrition.calories && nutrition.calories > 0) ||
        (nutrition.protein_g && nutrition.protein_g > 0) ||
        (nutrition.carbs_g && nutrition.carbs_g > 0) ||
        (nutrition.fat_g && nutrition.fat_g > 0)
    );

    if (!hasValidNutrition && recipe.ingredients) {
        try {
            nutrition = await calculateNutrition(recipe.ingredients, 1);
        } catch (error) {
            console.error('Error calculating nutrition:', error);
            nutrition = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugars_g: 0, saturated_fat_g: 0, trans_fat_g: 0, vitamin_d_iu: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0 };
        }
    }

    return nutrition || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugars_g: 0, saturated_fat_g: 0, trans_fat_g: 0, vitamin_d_iu: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0 };
}


// Format nutrition numbers to show 1-2 decimal places, avoiding zeros
function formatNutritionNumber(value, unit = '') {
    // Apply nutrition value validation before formatting (using script.js function)
    let adjustedValue = value;

    // Determine nutrient type from unit for validation
    let nutrientType = 'Unknown';
    if (unit === 'mg' && (value > 1000)) nutrientType = 'Sodium'; // High mg values likely sodium
    else if (unit === 'kcal' || unit === '') nutrientType = 'Calories';
    else if (unit === 'g' && value > 50) nutrientType = 'Protein';

    // Apply sanity checks if we detected a nutrient type (if adjustNutritionValue exists)
    if (nutrientType !== 'Unknown' && typeof adjustNutritionValue === 'function') {
        adjustedValue = adjustNutritionValue(value, nutrientType);
    }

    const num = Number(adjustedValue) || 0;

    // Add indicator if value was adjusted
    const wasAdjusted = Math.abs(Number(value) - num) > 0.1;
    const prefix = wasAdjusted ? '~' : '';

    if (num === 0) return `0.0${unit}`;
    if (num < 0.1) return `${prefix}<0.1${unit}`;
    if (num < 1) return `${prefix}${num.toFixed(2)}${unit}`;
    if (num < 10) return `${prefix}${num.toFixed(1)}${unit}`;
    return `${prefix}${num.toFixed(1)}${unit}`;
}

// Simple estimated nutrition based on common ingredients (fallback)
function estimateNutrition(ingredients, servings = 1) {
    if (!ingredients || !Array.isArray(ingredients)) {
        return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugars: 0, saturated_fat: 0, trans_fat: 0, vitamin_d: 0, calcium: 0, iron: 0, potassium: 0 };
    }

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    // Basic estimates per common ingredient type
    const estimates = {
        // Proteins
        'chicken': { cal: 165, prot: 31, carb: 0, fat: 3.6 },
        'beef': { cal: 250, prot: 26, carb: 0, fat: 15 },
        'fish': { cal: 140, prot: 25, carb: 0, fat: 3 },
        'egg': { cal: 70, prot: 6, carb: 1, fat: 5 },

        // Carbs
        'rice': { cal: 130, prot: 2.7, carb: 28, fat: 0.3 },
        'pasta': { cal: 131, prot: 5, carb: 25, fat: 1.1 },
        'bread': { cal: 265, prot: 9, carb: 49, fat: 3.2 },
        'potato': { cal: 77, prot: 2, carb: 17, fat: 0.1 },

        // Vegetables
        'tomato': { cal: 18, prot: 0.9, carb: 3.9, fat: 0.2 },
        'onion': { cal: 40, prot: 1.1, carb: 9.3, fat: 0.1 },
        'carrot': { cal: 41, prot: 0.9, carb: 9.6, fat: 0.2 },

        // Default
        'default': { cal: 50, prot: 2, carb: 8, fat: 1 }
    };

    ingredients.forEach(ingredient => {
        const ing = (typeof ingredient === 'string' ? ingredient : ingredient.text || '').toLowerCase();
        let matched = false;

        for (const [key, values] of Object.entries(estimates)) {
            if (ing.includes(key)) {
                totalCalories += values.cal;
                totalProtein += values.prot;
                totalCarbs += values.carb;
                totalFat += values.fat;
                matched = true;
                break;
            }
        }

        if (!matched) {
            const def = estimates.default;
            totalCalories += def.cal;
            totalProtein += def.prot;
            totalCarbs += def.carb;
            totalFat += def.fat;
        }
    });

    return {
        calories: Math.round(totalCalories / servings),
        protein: Math.round(totalProtein / servings),
        carbs: Math.round(totalCarbs / servings),
        fat: Math.round(totalFat / servings)
    };
}

// Nutrition calculation using the nutrition API with caching and fallback
async function calculateNutrition(ingredients, servings = 1) {
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugars: 0, saturated_fat: 0, trans_fat: 0, vitamin_d: 0, calcium: 0, iron: 0, potassium: 0 };
    }

    // Create cache key
    const cacheKey = JSON.stringify({ ingredients, servings });
    if (nutritionCache.has(cacheKey)) {
        return nutritionCache.get(cacheKey);
    }

    try {
        // Rate limiting - wait if needed
        const now = Date.now();
        const timeSinceLastRequest = now - lastNutritionRequest;
        if (timeSinceLastRequest < NUTRITION_REQUEST_DELAY) {
            await new Promise(resolve => setTimeout(resolve, NUTRITION_REQUEST_DELAY - timeSinceLastRequest));
        }
        lastNutritionRequest = Date.now();

        const normalized = ingredients.map(ingredient => ({
            text: typeof ingredient === 'string' ? ingredient : ingredient.text || ingredient.name || '',
            label: 'fresh'
        }));

        const response = await fetch(API_CONFIG.NUTRITION_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredients: normalized }),
            signal: AbortSignal.timeout(8000) // 8 second timeout
        });

        if (!response.ok) {
            console.warn('Nutrition API request failed:', response.status);
            // Only use estimation for complete API unavailability (network errors, 500+ status)
            if (response.status >= 500) {
                const estimated = estimateNutrition(ingredients, servings);
                nutritionCache.set(cacheKey, estimated);
                return estimated;
            }
            // For other failures (400, 404, etc), return zero values instead of wrong estimates
            return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugars_g: 0, saturated_fat_g: 0, trans_fat_g: 0, vitamin_d_iu: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0 };
        }

        const data = await response.json();

        if (!data.summary_100g_sum || Object.keys(data.summary_100g_sum).length === 0) {
            console.warn('No nutrition data found in API response');
            // If backend didn't provide any data, it means ingredients couldn't be matched
            // Return zero values instead of making up data
            return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugars_g: 0, saturated_fat_g: 0, trans_fat_g: 0, vitamin_d_iu: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0 };
        }

        const sum = data.summary_100g_sum;
        // NOTE: Backend returns TOTAL recipe nutrition in summary_100g_sum
        // Store the total values - do NOT divide by servings here
        // Servings division should be done at display time
        const nutrition = {
            calories: Math.round(sum.calories || 0),
            protein_g: Math.round(sum.protein || 0),
            carbs_g: Math.round(sum.carbohydrates || 0),
            fat_g: Math.round(sum.total_fat || 0),
            fiber_g: Math.round(sum.dietary_fiber || 0),
            sugars_g: Math.round(sum.total_sugars || 0),
            saturated_fat_g: Math.round(sum.saturated_fats || 0),
            trans_fat_g: Math.round(sum.trans_fats || 0),
            vitamin_d_iu: Math.round(sum.vitamin_d || 0),
            calcium_mg: Math.round(sum.calcium || 0),
            iron_mg: Math.round(sum.iron || 0),
            potassium_mg: Math.round(sum.potassium || 0),
            // Keep backward compatibility
            protein: Math.round(sum.protein || 0),
            carbs: Math.round(sum.carbohydrates || 0),
            fat: Math.round(sum.total_fat || 0)
        };

        // Cache the result
        nutritionCache.set(cacheKey, nutrition);
        return nutrition;
    } catch (error) {
        console.warn('Error calculating nutrition:', error.message);

        // Only use estimation for network errors, not for data parsing errors
        if (error.name === 'TypeError' || error.message.includes('fetch')) {
            console.warn('Network error - using estimation as last resort');
            const estimated = estimateNutrition(ingredients, servings);
            nutritionCache.set(cacheKey, estimated);
            return estimated;
        }

        // For other errors (parsing, etc), return zero values
        return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sodium_mg: 0, protein: 0, carbs: 0, fat: 0 };
    }
}

// Questionnaire data structure
const questionnaireSteps = [
    {
        step: 1,
        title: "Personal Information",
        questions: [
            {
                id: "age",
                label: "Age",
                type: "number",
                required: true,
                placeholder: "Enter your age (55-65)",
                validation: {
                    min: 55,
                    max: 65,
                    integerOnly: true,
                    message: "Age must be between 55 and 65 years",
                    integerMessage: "Please enter a number with no decimal"
                }
            },
            {
                id: "gender",
                label: "Gender",
                type: "select",
                required: true,
                options: [
                    { value: "", text: "Select your gender" },
                    { value: "male", text: "Male" },
                    { value: "female", text: "Female" },
                    { value: "other", text: "Other" },
                    { value: "prefer_not_to_say", text: "Prefer not to say" }
                ]
            },
            {
                id: "activity_level",
                label: "Activity Level",
                type: "select",
                required: true,
                options: [
                    { value: "", text: "Select your activity level" },
                    { value: "sedentary", text: "Sedentary (little to no exercise)" },
                    { value: "light", text: "Light activity (light exercise 1-3 days/week)" },
                    { value: "moderate", text: "Moderate activity (moderate exercise 3-5 days/week)" },
                    { value: "active", text: "Very active (hard exercise 6-7 days/week)" }
                ]
            }
        ]
    },
    {
        step: 2,
        title: "Dietary Preferences",
        questions: [
            {
                id: "diet_types",
                label: "Diet Types (Select all that apply)",
                type: "checkbox",
                required: false,
                options: [
                    { value: "vegetarian", text: "Vegetarian" },
                    { value: "vegan", text: "Vegan" },
                    { value: "keto", text: "Keto" },
                    { value: "kosher", text: "Kosher" },
                    { value: "raw", text: "Raw Food" },
                    { value: "low_sugar", text: "Low-Sugar" },
                    { value: "low_sodium", text: "Low-Sodium" },
                    { value: "healthyish", text: "Healthy" }
                ]
            },
            {
                id: "meal_preferences",
                label: "Preferred Meal Types (Select all that apply)",
                type: "checkbox",
                required: true,
                options: [
                    { value: "breakfast", text: "Breakfast" },
                    { value: "brunch", text: "Brunch" },
                    { value: "lunch", text: "Lunch" },
                    { value: "dinner", text: "Dinner" },
                    { value: "snack", text: "Snack" },
                    { value: "starter", text: "Starter" },
                    { value: "main", text: "Main Course" },
                    { value: "side", text: "Side Dish" }
                ],
                validation: {
                    minSelected: 2,
                    message: "Please select at least 2 meal types"
                }
            }
        ]
    },
    {
        step: 3,
        title: "Allergies & Food Restrictions",
        questions: [
            {
                id: "allergies",
                label: "Food Allergies (Select all that apply)",
                type: "checkbox",
                required: false,
                options: [
                    { value: "dairy_free", text: "Dairy-Free" },
                    { value: "gluten_free", text: "Gluten-Free" },
                    { value: "nut_free", text: "Nut-Free" },
                    { value: "shellfish_free", text: "Shellfish-Free" },
                    { value: "egg_free", text: "Egg-Free" },
                    { value: "soy_free", text: "Soy-Free" },
                    { value: "fish_free", text: "Fish-Free" }
                ]
            },
            {
                id: "cooking_difficulty",
                label: "Preferred Cooking Difficulty",
                type: "select",
                required: true,
                options: [
                    { value: "", text: "Select cooking difficulty" },
                    { value: "easy", text: "Easy (Simple recipes, minimal preparation)" },
                    { value: "moderate", text: "Moderate (Some cooking skills required)" },
                    { value: "any", text: "Any difficulty level" }
                ]
            }
        ]
    },
    {
        step: 4,
        title: "Nutrition Goals",
        questions: [
            {
                id: "calorie_target",
                label: "Daily Energy Needs",
                type: "select",
                required: true,
                options: [
                    { value: "", text: "Select your daily energy needs" },
                    { value: "1200-1500", text: "1200-1500 calories (Lower energy needs)" },
                    { value: "1500-1800", text: "1500-1800 calories (Medium energy needs)" },
                    { value: "1800-2200", text: "1800-2200 calories (High energy needs)" }
                ]
            }/*,
            {
                id: "nutrition_priorities",
                label: "Nutrition Priorities (Select all that apply)",
                type: "checkbox",
                required: false,
                options: [
                    { value: "high_protein", text: "High Protein" },
                    { value: "low_fat", text: "Low Fat" },
                    { value: "high_fiber", text: "High Fiber" },
                    { value: "low_cholesterol", text: "Low Cholesterol" },
                    { value: "calcium_rich", text: "Calcium Rich" },
                    { value: "vitamin_d", text: "Vitamin D" }
                ]
            },
            {
                id: "health_conditions",
                label: "Health Considerations (Optional)",
                type: "checkbox",
                required: false,
                options: [
                    { value: "diabetes", text: "Diabetes" },
                    { value: "hypertension", text: "High Blood Pressure" },
                    { value: "heart_disease", text: "Heart Disease" },
                    { value: "osteoporosis", text: "Osteoporosis" },
                    { value: "arthritis", text: "Arthritis" }
                ]
            }*/
        ]
    }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', async function () {
    console.log('Weekly Meal Plan initialized');
    await loadUserPreferences();
    renderCurrentStep();

    // Always show the Weekly Summary (even with placeholder data)
    await generateWeeklySummary();
});

// Load saved user preferences from localStorage
async function loadUserPreferences() {
    try {
        const saved = localStorage.getItem(API_CONFIG.STORAGE_KEYS.MEAL_PLAN_PREFERENCES);
        if (saved) {
            userPreferences = JSON.parse(saved);

            // Check if we have a saved plan and preferences are complete
            const savedPlan = localStorage.getItem(API_CONFIG.STORAGE_KEYS.WEEKLY_MEAL_PLAN);
            if (savedPlan && isPreferencesComplete()) {
                weeklyPlan = JSON.parse(savedPlan);
                console.log('Loaded meal plan from localStorage:', weeklyPlan);

                // Check if nutrition data exists in loaded plan
                if (weeklyPlan.plan) {
                    Object.keys(weeklyPlan.plan).forEach(day => {
                        if (weeklyPlan.plan[day] && typeof weeklyPlan.plan[day] === 'object') {
                            Object.keys(weeklyPlan.plan[day]).forEach(mealType => {
                                const recipe = weeklyPlan.plan[day][mealType];
                                if (recipe && recipe.title) {
                                    console.log(`${day} ${mealType} (${recipe.title}) - Has nutrition:`, !!recipe.nutrition);
                                }
                            });
                        }
                    });
                }

                await showWeeklyPlan();
                return;
            }
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
    }

    // Show questionnaire by default
    showQuestionnaire();
}

// Save user preferences to localStorage
function saveUserPreferences() {
    try {
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.MEAL_PLAN_PREFERENCES, JSON.stringify(userPreferences));
    } catch (error) {
        console.error('Error saving preferences:', error);
    }
}

// Check if all required preferences are complete
function isPreferencesComplete() {
    const requiredFields = ['age', 'gender', 'activity_level', 'meal_preferences', 'cooking_difficulty', 'calorie_target'];
    return requiredFields.every(field => userPreferences[field] &&
        (Array.isArray(userPreferences[field]) ? userPreferences[field].length > 0 : true));
}

// Show questionnaire interface
function showQuestionnaire() {
    document.getElementById('questionnaire-container').style.display = 'block';
    document.getElementById('weekly-plan-display').classList.remove('active');
    document.getElementById('loading-spinner').classList.add('hidden');
}

// Show weekly plan interface
async function showWeeklyPlan() {
    document.getElementById('questionnaire-container').style.display = 'none';
    document.getElementById('weekly-plan-display').classList.add('active');
    document.getElementById('loading-spinner').classList.add('hidden');

    if (weeklyPlan) {
        await renderWeeklyPlan();
    }
}

// Render the current questionnaire step
function renderCurrentStep() {
    const stepData = questionnaireSteps.find(s => s.step === currentStep);
    if (!stepData) return;

    updateStepIndicator();

    const content = document.getElementById('questionnaire-content');
    content.innerHTML = `
        <div class="questionnaire-header">
            <h2>Step ${currentStep}: ${stepData.title}</h2>
        </div>
        ${stepData.questions.map(question => renderQuestion(question)).join('')}
    `;

    // Add event listeners
    addEventListeners();

    // Update button states
    updateButtonStates();
}

// Render a single question
function renderQuestion(question) {
    const value = userPreferences[question.id];

    // Special logic for calorie_target - only show if gender is 'other' or 'prefer_not_to_say'
    if (question.id === 'calorie_target') {
        const gender = userPreferences.gender;
        if (gender === 'male' || gender === 'female') {
            // Skip rendering this question for male/female since we auto-set their calories
            return `
                <div class="question-group" style="display: none;">
                    <div class="auto-selected-info">
                        <i class="fas fa-info-circle"></i>
                        Daily calorie target automatically set based on gender selection: ${userPreferences.calorie_target || 'Not set'}
                    </div>
                </div>
            `;
        }
    }

    // Special logic for allergies - filter options based on diet types
    if (question.id === 'allergies') {
        question = filterAllergiesBasedOnDietTypes(question);
    }

    switch (question.type) {
        case 'text':
        case 'number':
            return `
                <div class="question-group">
                    <label class="question-label" for="${question.id}">
                        ${question.label} ${question.required ? '<span class="required">*</span>' : ''}
                    </label>
                    <input type="${question.type}" 
                           id="${question.id}" 
                           class="form-input" 
                           placeholder="${question.placeholder || ''}"
                           value="${value || ''}"
                           ${question.required ? 'required' : ''}>
                    <div class="input-hint">${getQuestionHint(question)}</div>
                    <div id="${question.id}-error" class="validation-message error-message" style="display:none;"></div>
                </div>
            `;

        case 'select':
            return `
                <div class="question-group">
                    <label class="question-label" for="${question.id}">
                        ${question.label} ${question.required ? '<span class="required">*</span>' : ''}
                    </label>
                    <select id="${question.id}" class="form-input" ${question.required ? 'required' : ''}>
                        ${question.options.map(opt =>
                `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.text}</option>`
            ).join('')}
                    </select>
                    <div class="input-hint">${getQuestionHint(question)}</div>
                    <div id="${question.id}-error" class="validation-message error-message" style="display:none;"></div>
                </div>
            `;

        case 'checkbox':
            const selectedValues = Array.isArray(value) ? value : [];
            return `
                <div class="question-group">
                    <label class="question-label">
                        ${question.label} ${question.required ? '<span class="required">*</span>' : ''}
                    </label>
                    <div class="checkbox-group">
                        ${question.options.map(opt => `
                            <div class="checkbox-option ${selectedValues.includes(opt.value) ? 'selected' : ''}"
                                 data-question-id="${question.id}" data-value="${opt.value}">
                                <input type="checkbox"
                                       id="${question.id}-${opt.value}"
                                       value="${opt.value}"
                                       ${selectedValues.includes(opt.value) ? 'checked' : ''}>
                                <label for="${question.id}-${opt.value}">${opt.text}</label>
                            </div>
                        `).join('')}
                    </div>
                    ${question.hiddenOptionsNote ? `
                        <div class="hidden-options-note">
                            <i class="fas fa-info-circle"></i>
                            ${question.hiddenOptionsNote}
                        </div>
                    ` : ''}
                    <div class="input-hint">${getQuestionHint(question)}</div>
                    <div id="${question.id}-error" class="validation-message error-message" style="display:none;"></div>
                </div>
            `;

        default:
            return '';
    }
}

// Get hint text for questions
function getQuestionHint(question) {
    const hints = {
        age: "Please enter your age between 55 and 65 years (Like 55, 60, 65)",
        meal_preferences: "Choose the types of meals you'd like in your weekly plan",
        diet_types: "Select any dietary preferences you follow",
        allergies: "Select any foods you need to avoid due to allergies",
        /*nutrition_priorities: "Select nutrition goals that are important to you",
        health_conditions: "Optional: Help us customize recommendations for your health needs"*/
    };
    return hints[question.id] || '';
}

// Add event listeners to form elements
function addEventListeners() {
    // Text and number inputs
    document.querySelectorAll('.form-input').forEach(input => {
        input.addEventListener('change', handleInputChange);
        input.addEventListener('blur', validateField);
    });

    // Checkbox options
    document.querySelectorAll('.checkbox-option').forEach(option => {
        option.addEventListener('click', handleCheckboxClick);
    });
}

// Handle input changes
function handleInputChange(event) {
    const { id, value, type } = event.target;

    if (type === 'number') {
        userPreferences[id] = value ? parseInt(value) : null;
    } else {
        userPreferences[id] = value;
    }

    // Handle gender-specific logic for calorie selection
    if (id === 'gender') {
        handleGenderChange(value);
    }

    saveUserPreferences();
    validateField(event);
}

// Handle gender change and auto-set calorie target for male/female
function handleGenderChange(gender) {
    if (gender === 'male') {
        // Auto-set male calorie target (typically higher needs)
        userPreferences.calorie_target = '1800-2200';
    } else if (gender === 'female') {
        // Auto-set female calorie target (typically moderate needs)
        userPreferences.calorie_target = '1500-1800';
    } else {
        // For 'other' or 'prefer_not_to_say', clear auto-selection to allow manual choice
        if (gender === 'other' || gender === 'prefer_not_to_say') {
            userPreferences.calorie_target = '';
        }
    }
}

// Filter allergies options based on selected diet types (hide irrelevant options)
function filterAllergiesBasedOnDietTypes(allergiesQuestion) {
    const selectedDietTypes = userPreferences.diet_types || [];

    // If no diet types selected, show all allergies options
    if (selectedDietTypes.length === 0) {
        return allergiesQuestion;
    }

    // Create a copy of the question to avoid modifying the original
    const filteredQuestion = { ...allergiesQuestion };

    // Start with all options
    let availableOptions = [...allergiesQuestion.options];

    // Logic for different diet types - hide options that are redundant
    const isVegan = selectedDietTypes.includes('vegan');
    const isVegetarian = selectedDietTypes.includes('vegetarian');
    const isKosher = selectedDietTypes.includes('kosher');

    // Options to hide based on diet choices
    let optionsToHide = [];

    if (isVegan) {
        // Vegans automatically avoid these, so hide these options
        optionsToHide.push('dairy_free', 'egg_free', 'fish_free', 'shellfish_free');
    } else if (isVegetarian) {
        // Vegetarians automatically avoid these, so hide these options
        optionsToHide.push('fish_free', 'shellfish_free');
    }

    if (isKosher) {
        // Kosher diet automatically avoids shellfish, so hide this option
        optionsToHide.push('shellfish_free');
    }

    // Remove duplicate options to hide
    optionsToHide = [...new Set(optionsToHide)];

    // Filter out the options that should be hidden
    filteredQuestion.options = availableOptions.filter(option =>
        !optionsToHide.includes(option.value)
    );

    // Add a note if options were hidden
    if (optionsToHide.length > 0) {
        const hiddenOptionsText = optionsToHide.map(option => {
            const originalOption = allergiesQuestion.options.find(opt => opt.value === option);
            return originalOption ? originalOption.text : option;
        }).join(', ');

        // Add info about hidden options
        filteredQuestion.hiddenOptionsNote = `Note: ${hiddenOptionsText} ${optionsToHide.length === 1 ? 'is' : 'are'} automatically avoided based on your diet choices.`;
    }

    return filteredQuestion;
}

// Handle checkbox clicks
function handleCheckboxClick(event) {
    const option = event.currentTarget;
    const questionId = option.dataset.questionId;
    const value = option.dataset.value;
    const checkbox = option.querySelector('input[type="checkbox"]');

    // Toggle checkbox
    checkbox.checked = !checkbox.checked;
    option.classList.toggle('selected', checkbox.checked);

    // Update preferences
    if (!userPreferences[questionId]) {
        userPreferences[questionId] = [];
    }

    if (checkbox.checked) {
        if (!userPreferences[questionId].includes(value)) {
            userPreferences[questionId].push(value);
        }
    } else {
        userPreferences[questionId] = userPreferences[questionId].filter(v => v !== value);
    }

    saveUserPreferences();
    validateField({ target: { id: questionId, value: '' } }); // Checkboxes don't need raw value validation
}

// Validate individual field
function validateField(event) {
    const questionId = event.target.id;
    const question = findQuestionById(questionId);
    if (!question) return;

    // Use raw input value for validation, not the converted value
    const rawValue = event.target.value;
    const value = userPreferences[questionId];
    const errorElement = document.getElementById(`${questionId}-error`);
    const inputElement = document.getElementById(questionId);

    let isValid = true;
    let errorMessage = '';

    // Required field validation
    if (question.required) {
        if (question.type === 'checkbox') {
            if (!value || value.length === 0) {
                isValid = false;
                errorMessage = 'This field is required';
            } else if (question.validation && question.validation.minSelected) {
                if (value.length < question.validation.minSelected) {
                    isValid = false;
                    errorMessage = question.validation.message;
                }
            }

        } else {
            if (!value || value === '') {
                isValid = false;
                errorMessage = 'This field is required';
            }
        }
    }

    // Specific validation rules
    if (isValid && rawValue && question.validation) {
        // Integer validation (check first, as it has priority)
        if (question.validation.integerOnly) {
            const numValue = parseFloat(rawValue);
            if (!Number.isInteger(numValue)) {
                isValid = false;
                errorMessage = question.validation.integerMessage || "Please enter a number with no decimal";
            }
        }

        // Range validation (only if still valid after integer check)
        if (isValid && question.validation.min && parseFloat(rawValue) < question.validation.min) {
            isValid = false;
            errorMessage = question.validation.message;
        }
        if (isValid && question.validation.max && parseFloat(rawValue) > question.validation.max) {
            isValid = false;
            errorMessage = question.validation.message;
        }
    }

    // Update UI
    if (errorElement) {
        if (isValid) {
            errorElement.style.display = 'none';
            if (inputElement) {
                inputElement.classList.remove('error');
                inputElement.classList.add('success');
            }
        } else {
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
            if (inputElement) {
                inputElement.classList.add('error');
                inputElement.classList.remove('success');
            }
        }
    }

    return isValid;
}

// Find question by ID
function findQuestionById(id) {
    for (const step of questionnaireSteps) {
        const question = step.questions.find(q => q.id === id);
        if (question) return question;
    }
    return null;
}

// Validate current step
function validateCurrentStep() {
    const stepData = questionnaireSteps.find(s => s.step === currentStep);
    if (!stepData) return false;

    let isValid = true;

    for (const question of stepData.questions) {
        const inputElement = document.getElementById(question.id);
        const fieldValid = validateField({ target: { id: question.id, value: inputElement ? inputElement.value : '' } });
        if (!fieldValid) {
            isValid = false;
        }
    }

    return isValid;
}

// Update step indicator
function updateStepIndicator() {
    document.querySelectorAll('.step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed');

        if (stepNum === currentStep) {
            step.classList.add('active');
        } else if (stepNum < currentStep) {
            step.classList.add('completed');
        }
    });
}

// Update button states
function updateButtonStates() {
    const backBtn = document.getElementById('btn-back');
    const nextBtn = document.getElementById('btn-next');

    // Back button
    backBtn.disabled = currentStep === 1;

    // Next button
    if (currentStep === questionnaireSteps.length) {
        nextBtn.innerHTML = '<i class="fas fa-check"></i> Generate Meal Plan';
    } else {
        nextBtn.innerHTML = 'Next <i class="fas fa-arrow-right"></i>';
    }
}

// Navigate to previous step
function goToPreviousStep() {
    if (currentStep > 1) {
        currentStep--;
        renderCurrentStep();
    }
}

// Navigate to next step or generate plan
function goToNextStep() {
    if (!validateCurrentStep()) {
        return;
    }

    if (currentStep < questionnaireSteps.length) {
        currentStep++;
        renderCurrentStep();
    } else {
        // Generate meal plan
        generateMealPlan();
    }
}

// Update progress display
function updateProgress(step, total, currentTask) {
    const percentage = Math.round((step / total) * 100);
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const progressPercentage = document.getElementById('progress-percentage');

    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = currentTask;
    if (progressPercentage) progressPercentage.textContent = `${percentage}%`;
}

// Generate weekly meal plan
async function generateMealPlan() {
    try {
        document.getElementById('loading-spinner').classList.remove('hidden');
        document.getElementById('questionnaire-container').style.display = 'none';

        console.log('Generating meal plan with preferences:', userPreferences);

        // Initialize progress
        updateProgress(0, 100, 'Initializing meal plan generation...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX

        // Generate plan for each day (Full week)
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']; // Full week
        const mealPlan = {};
        const selectedMealTypes = userPreferences.meal_preferences || ['breakfast', 'lunch', 'dinner'];
        const totalSteps = days.length * selectedMealTypes.length + 2; // +2 for init and finalize
        let currentStep = 1;

        // Track selected recipes to avoid duplicates
        const selectedRecipeIds = new Set();

        for (const day of days) {
            updateProgress(currentStep, totalSteps, `Generating meals for ${day}...`);
            mealPlan[day] = await generateDayMealsWithProgress(day, selectedMealTypes, currentStep, totalSteps, selectedRecipeIds);
            currentStep += selectedMealTypes.length;
        }

        // Finalizing
        updateProgress(totalSteps - 1, totalSteps, 'Finalizing your meal plan...');
        await new Promise(resolve => setTimeout(resolve, 300));

        // Convert plan object to days array for compatibility with rendering functions
        const daysArray = Object.keys(mealPlan).map(dayName => ({
            name: dayName,
            meals: mealPlan[dayName]
        }));

        weeklyPlan = {
            preferences: userPreferences,
            plan: mealPlan,
            days: daysArray, // Add days array for Weekly Summary
            generatedDate: new Date().toISOString(),
            weekStarting: getWeekStartDate()
        };

        // Save to localStorage
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.WEEKLY_MEAL_PLAN, JSON.stringify(weeklyPlan));

        // Complete progress
        updateProgress(totalSteps, totalSteps, 'Meal plan ready!');
        await new Promise(resolve => setTimeout(resolve, 500));

        await showWeeklyPlan();

    } catch (error) {
        console.error('Error generating meal plan:', error);
        alert('Sorry, there was an error generating your meal plan. Please try again.');
        showQuestionnaire();
    }
}


// Generate meals for a specific day
async function generateDayMeals(day, selectedRecipeIds = new Set()) {
    const meals = {};
    const selectedMealTypes = userPreferences.meal_preferences || ['breakfast', 'lunch', 'dinner'];

    for (const mealType of selectedMealTypes) {
        try {
            const recipe = await fetchRandomRecipe(mealType, selectedRecipeIds);
            if (recipe) {
                // Add this recipe to selected set to avoid duplicates
                selectedRecipeIds.add(recipe.recipe_id);

                // Calculate nutrition for this recipe
                console.log(`Calculating nutrition for ${recipe.title}...`);
                const nutrition = await calculateNutrition(recipe.ingredients || [], 1); // Get total recipe nutrition
                recipe.nutrition = nutrition; // Add nutrition data to recipe
                meals[mealType] = recipe;
            } else {
                console.warn(`No recipe found for ${mealType} on ${day} - API may be returning errors`);
            }
        } catch (error) {
            console.error(`Error fetching ${mealType} for ${day}:`, error);
        }
    }

    return meals;
}

// Generate meals for a specific day with progress tracking
async function generateDayMealsWithProgress(day, selectedMealTypes, baseStep, totalSteps, selectedRecipeIds) {
    const meals = {};

    for (let i = 0; i < selectedMealTypes.length; i++) {
        const mealType = selectedMealTypes[i];
        const currentStep = baseStep + i;

        // Update progress for this specific meal
        updateProgress(currentStep, totalSteps, `Generating ${mealType} for ${day}...`);

        try {
            const recipe = await fetchRandomRecipe(mealType, selectedRecipeIds);
            if (recipe) {
                // Add this recipe to selected set to avoid duplicates
                selectedRecipeIds.add(recipe.recipe_id);
                console.log(`Selected recipe for ${day} ${mealType}: ${recipe.title} (ID: ${recipe.recipe_id})`);

                // Calculate nutrition for this recipe
                console.log(`Calculating nutrition for ${recipe.title} (${mealType} for ${day})...`);
                const nutrition = await calculateNutrition(recipe.ingredients || [], 1); // Get total recipe nutrition
                console.log(`Nutrition calculated for ${recipe.title}:`, nutrition);
                recipe.nutrition = nutrition; // Add nutrition data to recipe
                meals[mealType] = recipe;
            } else {
                console.warn(`No recipe found for ${mealType} on ${day} - API may be returning errors`);
            }
        } catch (error) {
            console.error(`Error fetching ${mealType} for ${day}:`, error);
        }

        // Small delay to make progress visible
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    return meals;
}

// Map meal types to appropriate database categories
function getMealCategoryOptions(mealType) {
    const categoryMapping = {
        'breakfast': ['breakfast'],
        'lunch': ['lunch', 'dinner', 'salad'],  // Lunch can include salads, but not soups
        'dinner': ['dinner', 'lunch'],  // Primary dinner, fallback to lunch
        'snack': ['snack', 'dessert'],
        'dessert': ['dessert'],
        'soup': ['soup'],  // Only search for actual soup category
        'salad': ['salad'] // Only search for actual salad category
    };

    return categoryMapping[mealType] || ['dinner'];
}

// Fetch a random recipe based on preferences
async function fetchRandomRecipe(mealType, selectedRecipeIds = new Set()) {
    try {
        const categoryOptions = getMealCategoryOptions(mealType);

        // Try different search strategies if the first one fails
        const searchStrategies = [
            // Strategy 1: Primary category with full preferences
            () => {
                let params = new URLSearchParams({
                    category: categoryOptions[0],
                    limit: '30'
                });

                if (userPreferences.diet_types && userPreferences.diet_types.length > 0) {
                    params.append('diet_type', userPreferences.diet_types[0]);
                }

                if (userPreferences.allergies && userPreferences.allergies.length > 0) {
                    params.append('allergy_filter', userPreferences.allergies[0]);
                }

                return params;
            },

            // Strategy 2: Primary category with diet type only
            () => {
                let params = new URLSearchParams({
                    category: categoryOptions[0],
                    limit: '30'
                });

                if (userPreferences.diet_types && userPreferences.diet_types.length > 0) {
                    params.append('diet_type', userPreferences.diet_types[0]);
                }

                return params;
            },

            // Strategy 3: Primary category only
            () => {
                return new URLSearchParams({
                    category: categoryOptions[0],
                    limit: '30'
                });
            },

            // Strategy 4: Try secondary categories
            ...categoryOptions.slice(1).map(category => () => {
                return new URLSearchParams({
                    category: category,
                    limit: '30'
                });
            }),

            // Strategy 5: Targeted search without category (but filter results)
            () => {
                return new URLSearchParams({
                    limit: '50'
                });
            }
        ];

        for (let i = 0; i < searchStrategies.length; i++) {
            try {
                const params = searchStrategies[i]();
                const url = `${API_CONFIG.RECIPES_API}?${params.toString()}`;
                console.log(`Fetching recipes (strategy ${i + 1}):`, url);

                const response = await fetch(url);
                if (!response.ok) {
                    console.warn(`Strategy ${i + 1} failed with status:`, response.status);
                    continue;
                }

                const data = await response.json();
                console.log(`Strategy ${i + 1} response:`, data);

                if (data.items && data.items.length > 0) {
                    console.log(`Got ${data.items.length} recipes for ${mealType}`);

                    // Filter recipes based on user preferences
                    let filteredRecipes = filterRecipesByPreferences(data.items);
                    console.log(`After filtering: ${filteredRecipes.length} recipes for ${mealType}`);

                    // If filtering results in no recipes, continue to next strategy instead of ignoring preferences
                    if (filteredRecipes.length === 0) {
                        console.log(`No recipes match user preferences for ${mealType} with strategy ${i + 1}, trying next strategy...`);
                        continue; // Try next search strategy instead of ignoring user preferences
                    }

                    // Apply meal type filtering for all strategies
                    if (mealType !== 'any') {
                        console.log(`Before meal type filtering: ${filteredRecipes.length} recipes for ${mealType}`);
                        console.log(`Sample recipe categories:`, filteredRecipes.slice(0, 3).map(r => ({ name: r.name, categories: r.categories })));

                        filteredRecipes = filterRecipesByMealType(filteredRecipes, mealType, categoryOptions);

                        console.log(`After meal type filtering: ${filteredRecipes.length} recipes for ${mealType}`);
                        if (filteredRecipes.length > 0) {
                            console.log(`Selected recipe categories:`, filteredRecipes.slice(0, 3).map(r => ({ name: r.name, categories: r.categories })));
                        }
                    }

                    if (filteredRecipes.length > 0) {
                        // Filter out already selected recipes to avoid duplicates
                        const uniqueRecipes = filteredRecipes.filter(recipe => !selectedRecipeIds.has(recipe.recipe_id));
                        console.log(`After removing duplicates: ${uniqueRecipes.length} recipes (filtered out ${filteredRecipes.length - uniqueRecipes.length} duplicates)`);

                        // If no unique recipes left, try next strategy
                        if (uniqueRecipes.length === 0) {
                            console.log(`No unique recipes available for ${mealType} with strategy ${i + 1}, trying next strategy...`);
                            continue;
                        }

                        // Sort recipes by nutrition data quality (best first)
                        const sortedRecipes = sortRecipesByNutritionQuality(uniqueRecipes);
                        console.log(`Sorted ${sortedRecipes.length} unique recipes by nutrition quality for ${mealType}`);

                        // Prefer recipes from the top 50% (better nutrition data quality)
                        // But still include some randomness to avoid always picking the same recipe
                        const topHalfCount = Math.max(1, Math.ceil(sortedRecipes.length * 0.5));
                        const topRecipes = sortedRecipes.slice(0, topHalfCount);

                        const randomIndex = Math.floor(Math.random() * topRecipes.length);
                        const selectedRecipe = topRecipes[randomIndex];

                        console.log(`Selected recipe for ${mealType}: ${selectedRecipe.title} (ID: ${selectedRecipe.recipe_id}, quality score: ${selectedRecipe.nutritionQuality.score})`);
                        if (selectedRecipe.nutritionQuality.issues.length > 0) {
                            console.log(`Note: Recipe has potential nutrition issues:`, selectedRecipe.nutritionQuality.issues);
                        }

                        return selectedRecipe;
                    }
                }
            } catch (strategyError) {
                console.warn(`Strategy ${i + 1} failed:`, strategyError);
                continue;
            }
        }

        // Fallback strategy: try to find recipes from broader search
        console.log(`Fallback: Trying broader search for ${mealType}`);
        try {
            const fallbackResponse = await fetch(`${API_CONFIG.RECIPES_API}?limit=100`);
            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                const suitableRecipes = fallbackData.items.filter(recipe => {
                    // For salad, prefer vegetarian dishes
                    if (mealType === 'salad') {
                        return recipe.habits && (
                            recipe.habits.includes('vegetarian') ||
                            recipe.habits.includes('vegan') ||
                            recipe.title.toLowerCase().includes('salad')
                        );
                    }


                    // For other meal types, try to match categories or general suitability
                    if (recipe.categories) {
                        return recipe.categories.includes(mealType) ||
                            recipe.categories.includes('lunch') ||
                            recipe.categories.includes('dinner');
                    }

                    return false;
                });

                if (suitableRecipes.length > 0) {
                    const filtered = filterRecipesByPreferences(suitableRecipes);
                    if (filtered.length > 0) {
                        // Apply nutrition quality sorting for fallback recipes too
                        const sortedRecipes = sortRecipesByNutritionQuality(filtered);
                        const topHalfCount = Math.max(1, Math.ceil(sortedRecipes.length * 0.5));
                        const topRecipes = sortedRecipes.slice(0, topHalfCount);

                        const selected = topRecipes[Math.floor(Math.random() * topRecipes.length)];
                        console.log(`Fallback success: Selected ${selected.title} for ${mealType} (quality score: ${selected.nutritionQuality.score})`);
                        return selected;
                    }
                }
            }
        } catch (fallbackError) {
            console.error('Fallback strategy failed:', fallbackError);
        }

        console.warn(`No recipes found for ${mealType} after all strategies including fallback`);
        return null;

    } catch (error) {
        console.error('Error fetching recipe:', error);
        return null;
    }
}


// Filter recipes based on user preferences
// Evaluate nutrition data quality and flag problematic recipes
function evaluateNutritionDataQuality(recipe) {
    if (!recipe || !recipe.ingredients) {
        return { score: 0, issues: ['No ingredients data'] };
    }

    const issues = [];
    let score = 100; // Start with perfect score

    // Check if ingredients are available for nutrition calculation
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    if (ingredients.length === 0) {
        issues.push('No ingredients list');
        score -= 50;
    }

    // Check for problematic ingredient patterns that often cause high sodium/calories
    const problematicPatterns = [
        'soy sauce', 'tamari', 'miso', 'fish sauce', 'worcestershire',
        'prepared sauce', 'bouillon', 'instant', 'canned soup'
    ];

    const ingredientText = ingredients.join(' ').toLowerCase();
    let problematicCount = 0;

    problematicPatterns.forEach(pattern => {
        if (ingredientText.includes(pattern)) {
            problematicCount++;
        }
    });

    if (problematicCount > 2) {
        issues.push('High sodium risk ingredients');
        score -= 30;
    }

    // Check for very long ingredient lists (often cause calculation errors)
    if (ingredients.length > 15) {
        issues.push('Complex recipe (many ingredients)');
        score -= 10;
    }

    // Check for unclear ingredient descriptions
    const unclearCount = ingredients.filter(ing => {
        const text = typeof ing === 'string' ? ing : (ing.text || '');
        return text.length > 50 || text.includes('or') || text.includes('optional');
    }).length;

    if (unclearCount > ingredients.length * 0.3) {
        issues.push('Unclear ingredient descriptions');
        score -= 20;
    }

    return { score: Math.max(0, score), issues };
}

// Sort recipes by nutrition data quality (higher score = better quality)
function sortRecipesByNutritionQuality(recipes) {
    return recipes.map(recipe => ({
        ...recipe,
        nutritionQuality: evaluateNutritionDataQuality(recipe)
    })).sort((a, b) => {
        // Primary sort: nutrition quality score (higher is better)
        if (b.nutritionQuality.score !== a.nutritionQuality.score) {
            return b.nutritionQuality.score - a.nutritionQuality.score;
        }
        // Secondary sort: fewer ingredients (simpler recipes are more reliable)
        const aIngredients = Array.isArray(a.ingredients) ? a.ingredients.length : 0;
        const bIngredients = Array.isArray(b.ingredients) ? b.ingredients.length : 0;
        return aIngredients - bIngredients;
    });
}

// Filter recipes by meal type to ensure appropriate categorization
function filterRecipesByMealType(recipes, mealType, categoryOptions) {
    return recipes.filter(recipe => {
        // Check if recipe has categories
        if (!recipe.categories || !Array.isArray(recipe.categories)) {
            return false;
        }

        // For breakfast - must be breakfast category
        if (mealType === 'breakfast') {
            return recipe.categories.includes('breakfast');
        }

        // For lunch - allow lunch, dinner, salad, but exclude dessert/snack/beverage/soup
        if (mealType === 'lunch') {
            const appropriateCategories = ['lunch', 'dinner', 'salad'];
            const excludeCategories = ['dessert', 'snack', 'beverage', 'soup'];

            const hasAppropriate = recipe.categories.some(cat => appropriateCategories.includes(cat));
            const hasExcluded = recipe.categories.some(cat => excludeCategories.includes(cat));

            return hasAppropriate && !hasExcluded;
        }

        // For dinner - allow dinner, lunch, but exclude dessert/snack/beverage/breakfast
        if (mealType === 'dinner') {
            const appropriateCategories = ['dinner', 'lunch'];
            const excludeCategories = ['dessert', 'snack', 'beverage', 'breakfast'];

            const hasAppropriate = recipe.categories.some(cat => appropriateCategories.includes(cat));
            const hasExcluded = recipe.categories.some(cat => excludeCategories.includes(cat));

            return hasAppropriate && !hasExcluded;
        }

        // For snack - allow snack, dessert
        if (mealType === 'snack') {
            return recipe.categories.includes('snack') || recipe.categories.includes('dessert');
        }

        // For dessert - must be dessert
        if (mealType === 'dessert') {
            return recipe.categories.includes('dessert');
        }

        // For soup - must be soup category only
        if (mealType === 'soup') {
            return recipe.categories.includes('soup') && !recipe.categories.includes('dinner') && !recipe.categories.includes('lunch');
        }

        // For salad - must be salad category only
        if (mealType === 'salad') {
            return recipe.categories.includes('salad');
        }

        // Default: check if any of the category options match
        return recipe.categories.some(cat => categoryOptions.includes(cat));
    });
}

function filterRecipesByPreferences(recipes) {
    return recipes.filter(recipe => {
        // Ensure recipe has habits array
        if (!recipe.habits || !Array.isArray(recipe.habits)) {
            return false;
        }

        // Check diet types (HIGHEST PRIORITY - strict filtering)
        if (userPreferences.diet_types && userPreferences.diet_types.length > 0) {
            for (const diet of userPreferences.diet_types) {
                if (diet === 'vegetarian') {
                    // Strict vegetarian check: must have vegetarian tag AND not have meat/seafood
                    if (!recipe.habits.includes('vegetarian')) {
                        return false;
                    }

                    // Double-check: exclude any recipe with seafood or meat indicators
                    if (recipe.habits.includes('contains_seafood')) {
                        return false;
                    }

                    // Additional ingredient-level check for meat/seafood
                    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                        const ingredientText = recipe.ingredients.join(' ').toLowerCase();
                        const meatKeywords = ['chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'tuna', 'cod', 'halibut', 'bass', 'shrimp', 'crab', 'lobster', 'bacon', 'ham', 'sausage', 'turkey'];
                        if (meatKeywords.some(meat => ingredientText.includes(meat))) {
                            return false;
                        }
                    }
                } else if (diet === 'vegan') {
                    // Strict vegan check: must be vegan, no animal products
                    if (!recipe.habits.includes('vegan')) {
                        return false;
                    }

                    // Additional check to exclude any animal product indicators
                    const animalProducts = ['contains_dairy', 'contains_eggs', 'contains_seafood'];
                    if (animalProducts.some(product => recipe.habits.includes(product))) {
                        return false;
                    }
                } else if (diet === 'low_sugar') {
                    // Must have low_sugar tag and exclude high-sugar foods
                    if (!recipe.habits.includes('low_sugar')) {
                        return false;
                    }
                } else if (diet === 'low_sodium') {
                    // Must have low_sodium tag
                    if (!recipe.habits.includes('low_sodium')) {
                        return false;
                    }
                } else if (diet === 'heart_healthy') {
                    // Must have heart_healthy tag
                    if (!recipe.habits.includes('heart_healthy')) {
                        return false;
                    }
                } else if (diet === 'diabetic_friendly') {
                    // Must have diabetic_friendly tag
                    if (!recipe.habits.includes('diabetic_friendly')) {
                        return false;
                    }
                } else if (diet === 'soft_food') {
                    // Must have soft_food tag
                    if (!recipe.habits.includes('soft_food')) {
                        return false;
                    }
                } else {
                    // For any other diet types, check if recipe has the tag
                    if (!recipe.habits.includes(diet)) {
                        return false;
                    }
                }
            }
        }

        // Check allergies (STRICT filtering - user safety)
        if (userPreferences.allergies && userPreferences.allergies.length > 0) {
            for (const allergy of userPreferences.allergies) {
                if (allergy === 'dairy_free') {
                    // Must be dairy-free AND not contain dairy
                    if (!recipe.habits.includes('dairy_free') || recipe.habits.includes('contains_dairy')) {
                        return false;
                    }
                } else if (allergy === 'gluten_free') {
                    // Must be gluten-free AND not contain gluten
                    if (!recipe.habits.includes('gluten_free') || recipe.habits.includes('contains_gluten')) {
                        return false;
                    }
                } else if (allergy === 'nut_free') {
                    // Must be nut-free AND not contain nuts
                    if (!recipe.habits.includes('nut_free') || recipe.habits.includes('contains_nuts')) {
                        return false;
                    }
                } else if (allergy === 'shellfish_free') {
                    // Must be shellfish-free AND not contain shellfish
                    if (!recipe.habits.includes('shellfish_free') || recipe.habits.includes('contains_shellfish')) {
                        return false;
                    }
                    // Additional ingredient check for shellfish
                    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                        const ingredientText = recipe.ingredients.join(' ').toLowerCase();
                        const shellfishKeywords = ['shrimp', 'crab', 'lobster', 'scallop', 'oyster', 'mussel', 'clam', 'crawfish', 'crayfish', 'prawn'];
                        if (shellfishKeywords.some(shellfish => ingredientText.includes(shellfish))) {
                            return false;
                        }
                    }
                } else if (allergy === 'egg_free') {
                    // Must be egg-free AND not contain eggs
                    if (!recipe.habits.includes('egg_free') || recipe.habits.includes('contains_eggs')) {
                        return false;
                    }
                } else if (allergy === 'soy_free') {
                    // Must be soy-free AND not contain soy
                    if (!recipe.habits.includes('soy_free') || recipe.habits.includes('contains_soy')) {
                        return false;
                    }
                } else if (allergy === 'fish_free') {
                    // Must be fish-free AND not contain fish/seafood
                    if (!recipe.habits.includes('fish_free') || recipe.habits.includes('contains_seafood')) {
                        return false;
                    }
                    // Additional ingredient check for fish
                    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                        const ingredientText = recipe.ingredients.join(' ').toLowerCase();
                        const fishKeywords = ['fish', 'salmon', 'tuna', 'cod', 'halibut', 'bass', 'tilapia', 'trout', 'mackerel', 'sardine', 'anchovy'];
                        if (fishKeywords.some(fish => ingredientText.includes(fish))) {
                            return false;
                        }
                    }
                } else {
                    // Generic allergy check - backwards compatibility
                    const allergenTag = allergy.replace('_free', '');
                    if (recipe.habits.includes(`contains_${allergenTag}`) || recipe.habits.includes(allergenTag)) {
                        return false;
                    }
                }
            }
        }

        // Check nutrition priorities (flexible matching - may not all be available)
        // Commented out since nutrition_priorities was removed from questionnaire
        /*
        if (userPreferences.nutrition_priorities && userPreferences.nutrition_priorities.length > 0) {
            // For nutrition priorities, we use a more flexible approach since not all may have direct tags
            let hasAnyNutritionMatch = false;

            for (const nutrition of userPreferences.nutrition_priorities) {
                if (nutrition === 'high_protein') {
                    // Look for protein-rich indicators
                    if (recipe.habits.includes('high_protein') ||
                        (recipe.ingredients && Array.isArray(recipe.ingredients))) {
                        const ingredientText = recipe.ingredients.join(' ').toLowerCase();
                        const proteinSources = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'eggs', 'tofu', 'beans', 'lentils', 'chickpea', 'quinoa'];
                        if (proteinSources.some(protein => ingredientText.includes(protein))) {
                            hasAnyNutritionMatch = true;
                            break;
                        }
                    }
                } else if (nutrition === 'low_fat') {
                    // Look for low-fat indicators
                    if (recipe.habits.includes('low_fat') || recipe.habits.includes('heart_healthy')) {
                        hasAnyNutritionMatch = true;
                        break;
                    }
                } else if (nutrition === 'high_fiber') {
                    // Look for high-fiber indicators
                    if (recipe.habits.includes('high_fiber') ||
                        (recipe.ingredients && Array.isArray(recipe.ingredients))) {
                        const ingredientText = recipe.ingredients.join(' ').toLowerCase();
                        const fiberSources = ['beans', 'lentils', 'oats', 'quinoa', 'brown rice', 'vegetables', 'broccoli', 'spinach', 'apple', 'pear'];
                        if (fiberSources.some(fiber => ingredientText.includes(fiber))) {
                            hasAnyNutritionMatch = true;
                            break;
                        }
                    }
                } else if (nutrition === 'low_cholesterol') {
                    // Look for low-cholesterol indicators (typically vegetarian/vegan foods)
                    if (recipe.habits.includes('low_cholesterol') ||
                        recipe.habits.includes('vegetarian') ||
                        recipe.habits.includes('vegan')) {
                        hasAnyNutritionMatch = true;
                        break;
                    }
                } else if (nutrition === 'calcium_rich') {
                    // Look for calcium-rich indicators
                    if (recipe.habits.includes('calcium_rich') ||
                        (recipe.ingredients && Array.isArray(recipe.ingredients))) {
                        const ingredientText = recipe.ingredients.join(' ').toLowerCase();
                        const calciumSources = ['milk', 'cheese', 'yogurt', 'kale', 'spinach', 'almonds', 'salmon', 'sardines'];
                        if (calciumSources.some(calcium => ingredientText.includes(calcium))) {
                            hasAnyNutritionMatch = true;
                            break;
                        }
                    }
                } else if (nutrition === 'vitamin_d') {
                    // Look for vitamin D indicators
                    if (recipe.habits.includes('vitamin_d') ||
                        (recipe.ingredients && Array.isArray(recipe.ingredients))) {
                        const ingredientText = recipe.ingredients.join(' ').toLowerCase();
                        const vitaminDSources = ['salmon', 'tuna', 'mackerel', 'eggs', 'mushrooms'];
                        if (vitaminDSources.some(vitD => ingredientText.includes(vitD))) {
                            hasAnyNutritionMatch = true;
                            break;
                        }
                    }
                } else {
                    // Direct tag matching for any other nutrition priorities
                    if (recipe.habits.includes(nutrition)) {
                        hasAnyNutritionMatch = true;
                        break;
                    }
                }
            }

            // Only require at least one nutrition priority to match (flexible)
            if (!hasAnyNutritionMatch) {
                return false;
            }
        }
        */

        // Check health considerations (if available in database)
        if (userPreferences.health_considerations && userPreferences.health_considerations.length > 0) {
            // This is likely undefined in the current questionnaire, but included for future use
            const hasMatchingHealth = userPreferences.health_considerations.some(health =>
                recipe.habits.includes(health)
            );
            if (!hasMatchingHealth) {
                return false;
            }
        }

        return true;
    });
}

// Get the start date of the current week
function getWeekStartDate() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday as start
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
}

// Render the weekly meal plan
async function renderWeeklyPlan() {
    if (!weeklyPlan) {
        renderPlanLoading();
        return;
    }

    // Update plan header info
    const userInfo = `${userPreferences.gender || 'User'}, ${userPreferences.age} years old`;
    document.getElementById('plan-user-info').textContent = userInfo;

    // Update date range
    const weekStart = new Date(weeklyPlan.weekStarting);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const dateRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    document.getElementById('plan-date-range').textContent = dateRange;

    // Render weekly days
    await renderWeeklyDays();
}

// Render plan loading state
function renderPlanLoading() {
    const container = document.getElementById('weekly-days-container');
    container.innerHTML = `
        <div class="plan-loading">
            <div class="spinner"></div>
            <p>Loading your personalized meal plan...</p>
        </div>
    `;
}

// Render the weekly days layout
async function renderWeeklyDays() {
    const container = document.getElementById('weekly-days-container');
    // Get the actual days from the plan
    const days = Object.keys(weeklyPlan.plan || {}); // Use actual generated days

    const weekStart = new Date(weeklyPlan.weekStarting);

    // Generate day sections with async meal cards
    const dayPromises = days.map(async (day, index) => {
        const currentDate = new Date(weekStart);
        currentDate.setDate(weekStart.getDate() + index);

        const dayMeals = weeklyPlan.plan[day] || {};
        const dayDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        let mealsHTML = '';
        if (Object.keys(dayMeals).length > 0) {
            // Sort meals by predefined order instead of object key order
            const sortedMealEntries = API_CONFIG.MEAL_TYPE_ORDER
                .filter(mealType => dayMeals.hasOwnProperty(mealType))
                .map(mealType => [mealType, dayMeals[mealType]]);

            const mealPromises = sortedMealEntries.map(([mealType, recipe]) =>
                renderLargeRecipeCard(mealType, recipe)
            );
            const mealCards = await Promise.all(mealPromises);
            mealsHTML = mealCards.join('');
        } else {
            mealsHTML = '<div class="empty-meal-slot"><i class="fas fa-utensils"></i><h4>No meals planned</h4><p>Generate a meal plan to see recipes here</p></div>';
        }

        return `
            <div class="day-section">
                <div class="day-section-header">
                    <h2 class="day-title">
                        <i class="fas fa-calendar-day"></i>
                        ${day}
                    </h2>
                    <span class="day-date-info">${dayDate}</span>
                </div>
                <div class="day-meals-grid">
                    ${mealsHTML}
                </div>
            </div>
        `;
    });

    const dayHTML = await Promise.all(dayPromises);
    container.innerHTML = dayHTML.join('');

    // Generate Weekly Summary
    await generateWeeklySummary(weeklyPlan);
}

// Render large recipe card (same style as explore-recipes)
async function renderLargeRecipeCard(mealType, recipe) {
    if (!recipe) {
        return `
            <div class="empty-meal-slot">
                <i class="fas fa-utensils"></i>
                <h4>No ${mealType} planned</h4>
                <p>Generate a meal plan to add recipes</p>
            </div>
        `;
    }

    // Use consistent nutrition data (same logic as modal)
    const nutrition = await getConsistentNutrition(recipe);
    const servings = recipe.servings || recipe.yield || 4; // Default to 4 servings

    const nutritionInfo = `<div class="recipe-nutrition-info">
        <span class="nutrition-item"><strong>Calories:</strong> ${formatNutritionNumber((nutrition.calories || 0) / servings)}</span>
        <span class="nutrition-item"><strong>Protein:</strong> ${formatNutritionNumber((nutrition.protein_g || 0) / servings, 'g')}</span>
        <span class="nutrition-item"><strong>Calcium:</strong> ${formatNutritionNumber((nutrition.calcium_mg || 0) / servings, 'mg')}</span>
        <span class="nutrition-item"><strong>Vitamin D:</strong> ${formatNutritionNumber((nutrition.vitamin_d_iu || 0) / servings, 'IU')}</span>
    </div>`;

    // Image handling (same as explore-recipes)
    const imageHtml = recipe.has_image && recipe.image_display ?
        `<div class="recipe-image"><img src="${recipe.image_display}" alt="${recipe.title}" onerror="this.parentElement.innerHTML='<i class=\\"fas fa-utensils\\" style=\\"color:#ccc;font-size:3rem;\\"></i>'"></div>` :
        `<div class="recipe-image-placeholder"><i class="fas fa-utensils"></i></div>`;

    return `
        <div class="recipe-card" onclick="openRecipeModal('${recipe.recipe_id}')" style="cursor: pointer;">
            ${imageHtml}
            <div class="recipe-content">
                <div class="recipe-title">${recipe.title}</div>
                <div class="meal-type-badge ${mealType}">${mealType}</div>
                ${nutritionInfo}
            </div>
        </div>
    `;
}

// Render a meal card (same style as explore-recipes)
async function renderMealCard(mealType, recipe) {
    if (!recipe) {
        return `
            <div class="recipe-card">
                <div class="recipe-image-placeholder">
                    <i class="fas fa-utensils"></i>
                </div>
                <div class="recipe-content">
                    <div class="recipe-title">No recipe found</div>
                    <div class="meal-type-badge ${mealType}">${mealType}</div>
                </div>
            </div>
        `;
    }

    // Use consistent nutrition data (same logic as modal)
    const nutrition = await getConsistentNutrition(recipe);
    const servings = recipe.servings || recipe.yield || 4; // Default to 4 servings
    const nutritionInfo = `<div class="recipe-nutrition-info">
        <span class="nutrition-item"><strong>Calories:</strong> ${formatNutritionNumber((nutrition.calories || 0) / servings)}</span>
        <span class="nutrition-item"><strong>Protein:</strong> ${formatNutritionNumber((nutrition.protein_g || 0) / servings, 'g')}</span>
        <span class="nutrition-item"><strong>Calcium:</strong> ${formatNutritionNumber((nutrition.calcium_mg || 0) / servings, 'mg')}</span>
        <span class="nutrition-item"><strong>Vitamin D:</strong> ${formatNutritionNumber((nutrition.vitamin_d_iu || 0) / servings, 'IU')}</span>
    </div>`;

    // Image handling (same as explore-recipes)
    const imageHtml = recipe.has_image && recipe.image_display ?
        `<div class="recipe-image"><img src="${recipe.image_display}" alt="${recipe.title}" onerror="this.parentElement.innerHTML='<i class=\\"fas fa-utensils\\" style=\\"color:#ccc;font-size:3rem;\\"></i>'"></div>` :
        `<div class="recipe-image-placeholder"><i class="fas fa-utensils"></i></div>`;

    return `
        <div class="recipe-card" onclick="openRecipeModal('${recipe.recipe_id}')" style="cursor: pointer;">
            ${imageHtml}
            <div class="recipe-content">
                <div class="recipe-title">${recipe.title}</div>
                <div class="meal-type-badge ${mealType}">${mealType}</div>
                ${nutritionInfo}
            </div>
        </div>
    `;
}

// Generate shopping list from current meal plan
function generateShoppingList() {
    if (!weeklyPlan || !weeklyPlan.plan) {
        alert('Please generate a meal plan first before creating a shopping list.');
        return;
    }

    try {
        // Extract all ingredients from the meal plan
        const allIngredients = [];
        const days = Object.keys(weeklyPlan.plan);

        days.forEach(day => {
            const dayMeals = weeklyPlan.plan[day];
            Object.values(dayMeals).forEach(recipe => {
                if (recipe && recipe.ingredients && Array.isArray(recipe.ingredients)) {
                    recipe.ingredients.forEach(ingredient => {
                        allIngredients.push({
                            name: ingredient,
                            recipe: recipe.title,
                            source: 'meal-plan'
                        });
                    });
                }
            });
        });

        if (allIngredients.length === 0) {
            alert('No ingredients found in your meal plan.');
            return;
        }

        // Store ingredients in localStorage for shopping-list.html to pick up
        localStorage.setItem('mealPlanIngredients', JSON.stringify(allIngredients));
        localStorage.setItem('shoppingListGenerated', 'true');

        // Navigate to shopping list page
        window.location.href = 'shopping-list.html';

    } catch (error) {
        console.error('Error generating shopping list:', error);
        alert('Error generating shopping list. Please try again.');
    }
}

// Regenerate meal plan
function regeneratePlan() {
    if (confirm('Are you sure you want to generate a new meal plan? This will replace your current plan.')) {
        generateMealPlan();
    }
}

// Update preferences
function updatePreferences() {
    currentStep = 1;
    showQuestionnaire();
    renderCurrentStep();
}

// Recipe modal functionality - integrated from explore-recipes
function ensureRecipeModal() {
    let m = document.getElementById('recipe-modal');
    if (m) return m;

    // Create modal if it doesn't exist
    const modalHTML = `
    <div id="recipe-modal" class="modal" aria-hidden="true" style="display:none">
        <div class="modal-backdrop"></div>
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="recipe-modal-title">
            <button class="modal-close" aria-label="Close">&times;</button>

            <!-- Recipe Title -->
            <h2 id="recipe-modal-title"></h2>

            <!-- Recipe Image -->
            <div id="recipe-modal-image" class="modal-recipe-image" style="display:none;">
                <img id="recipe-modal-img" src="" alt="" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">
            </div>
            <p id="recipe-brief" class="recipe-brief"></p>

            <!-- Nutrition Summary (Top Section) -->
            <div class="nutrition-top-section" style="margin-bottom: 1.5rem;">
                <h3>Nutrition Information</h3>
                <div id="nutrition-summary" class="nutri-grid">
                    <!-- nutrition cards inserted by JS -->
                </div>
            </div>

            <!-- Ingredients and Instructions (Two Columns) -->
            <div class="modal-cols">
                <div class="modal-col">
                    <h3>Ingredients</h3>
                    <ul id="recipe-ingredients" class="ingredients-list"></ul>
                </div>
                <div class="modal-col">
                    <h3>Instructions</h3>
                    <ol id="recipe-directions" class="directions-list"></ol>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    m = document.getElementById('recipe-modal');

    // Add close functionality
    const closeBtn = m.querySelector('.modal-close');
    const backdrop = m.querySelector('.modal-backdrop');

    function closeModal() {
        m.setAttribute('aria-hidden', 'true');
        m.style.display = 'none';
        document.body.style.overflow = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    // ESC key to close
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && m.style.display === 'block') {
            closeModal();
        }
    });

    return m;
}

function openModal() {
    const m = ensureRecipeModal();
    m.setAttribute('aria-hidden', 'false');
    m.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Open recipe modal and fetch recipe details
async function openRecipeModal(recipeId) {
    try {
        // Fetch recipe details
        const response = await fetch(`${API_CONFIG.RECIPES_API}?recipe_id=${recipeId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const recipe = await response.json();

        const m = ensureRecipeModal();
        const titleEl = m.querySelector('#recipe-modal-title');
        const ingEl = m.querySelector('#recipe-ingredients');
        const dirEl = m.querySelector('#recipe-directions');
        const sumEl = m.querySelector('#nutrition-summary');
        const imgContainerEl = m.querySelector('#recipe-modal-image');
        const imgEl = m.querySelector('#recipe-modal-img');

        if (titleEl) titleEl.textContent = recipe.title || '';

        // Handle recipe image in modal
        if (recipe.has_image && recipe.image_display && imgContainerEl && imgEl) {
            imgEl.src = recipe.image_display;
            imgEl.alt = recipe.title || 'Recipe Image';
            imgEl.style.display = 'block';
            imgContainerEl.style.display = 'block';
        } else {
            if (imgContainerEl) imgContainerEl.style.display = 'none';
        }

        // Populate ingredients
        if (ingEl) {
            ingEl.innerHTML = '';
            if (Array.isArray(recipe.ingredients)) {
                recipe.ingredients.forEach(ingredient => {
                    const li = document.createElement('li');
                    li.textContent = ingredient;
                    ingEl.appendChild(li);
                });
            } else {
                ingEl.innerHTML = '<li>No ingredients available</li>';
            }
        }

        // Populate directions/instructions
        if (dirEl) {
            dirEl.innerHTML = '';
            let instructions = recipe.directions || recipe.instructions || [];

            // Handle different instruction formats
            if (typeof instructions === 'object' && !Array.isArray(instructions)) {
                // Convert object to array
                instructions = Object.values(instructions);
            }

            if (Array.isArray(instructions) && instructions.length > 0) {
                instructions.forEach(instruction => {
                    const li = document.createElement('li');
                    // Handle both string instructions and object instructions
                    const text = typeof instruction === 'string' ? instruction : (instruction.text || instruction);
                    li.textContent = text;
                    dirEl.appendChild(li);
                });
            } else {
                dirEl.innerHTML = '<li>No instructions available</li>';
            }
        }

        // Show nutrition info (per serving) - use consistent nutrition data
        if (sumEl) {
            console.log('Getting consistent nutrition for modal:', recipe.title);
            const nutrition = await getConsistentNutrition(recipe);

            if (nutrition) {
                console.log('Recipe nutrition data:', nutrition);
                const servings = recipe.servings || recipe.yield || 4; // Default to 4 servings
                console.log('Recipe servings:', servings);
                sumEl.innerHTML = '';

                const nutritionPairs = [
                    { key: 'calories', value: nutrition.calories || 0, unit: 'kcal', label: 'Calories' },
                    { key: 'protein_g', value: nutrition.protein_g || 0, unit: 'g', label: 'Protein' },
                    { key: 'calcium_mg', value: nutrition.calcium_mg || 0, unit: 'mg', label: 'Calcium' },
                    { key: 'vitamin_d_iu', value: nutrition.vitamin_d_iu || 0, unit: 'IU', label: 'Vitamin D' }
                ];

                nutritionPairs.forEach(p => {
                    const perServingValue = p.value / servings;
                    const formattedValue = formatNutritionNumber(perServingValue, p.unit);
                    console.log(`Nutrition debug: ${p.label} = ${p.value} / ${servings} = ${perServingValue} -> ${formattedValue}`);

                    const card = document.createElement('div');
                    card.className = 'card';
                    card.innerHTML = `
                        <div class="key">${p.label}</div>
                        <div class="val">${formattedValue}</div>
                    `;
                    sumEl.appendChild(card);
                });

                const servingsInfo = document.createElement('div');
                servingsInfo.className = 'recipe-servings-info';
                servingsInfo.style.cssText = 'margin-top: 0.5rem; font-size: 0.9em; color: #666;';
                servingsInfo.textContent = `Recipe serves ${servings} people`;
                sumEl.appendChild(servingsInfo);
            } else {
                sumEl.innerHTML = '<p style="color: #666; font-style: italic;">Nutrition information not available</p>';
            }
        }

        openModal();

    } catch (error) {
        console.error('Error opening recipe modal:', error);
        alert('Sorry, there was an error loading the recipe details.');
    }
}

// Print meal plan
function printMealPlan() {
    window.print();
}

// Generate Weekly Summary
async function generateWeeklySummary(weeklyPlan) {
    const summaryContainer = document.getElementById('weekly-summary');
    if (!summaryContainer) return;

    // If no plan data, show default/placeholder summary
    if (!weeklyPlan || !weeklyPlan.days) {
        summaryContainer.innerHTML = `
            <div class="simple-weekly-summary">
                <div class="summary-card">
                    <h4 class="summary-title"><i class="fas fa-chart-bar"></i> Weekly Summary</h4>
                    <div class="summary-metrics">
                        <div class="metric-item">
                            <span class="metric-label">Days Planned</span>
                            <span class="metric-value">0</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Meals Included</span>
                            <span class="metric-value">0</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Avg Daily Calories</span>
                            <span class="metric-value">--</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Health Goals Met</span>
                            <span class="metric-value">--</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalSodium = 0;
    let totalMeals = 0;

    // Calculate totals from all meals (convert to per-serving values)
    // Use async processing for consistent nutrition data
    // Get the actual meal types the user selected
    const selectedMealTypes = weeklyPlan.preferences?.meal_preferences || ['breakfast', 'lunch', 'dinner'];

    for (const day of weeklyPlan.days) {
        for (const mealType of selectedMealTypes) {
            const recipe = day.meals[mealType];
            if (recipe) {
                try {
                    // Use consistent nutrition data (same logic as cards and modal)
                    const nutrition = await getConsistentNutrition(recipe);
                    const servings = recipe.servings || recipe.yield || 4; // Default to 4 servings

                    // Convert total recipe nutrition to per-serving values
                    totalCalories += (nutrition.calories || 0) / servings;
                    totalProtein += (nutrition.protein_g || 0) / servings;
                    totalCarbs += (nutrition.carbs_g || 0) / servings;
                    totalSodium += (nutrition.sodium_mg || 0) / servings;
                    totalMeals++;
                } catch (error) {
                    console.error(`Error getting nutrition for ${recipe.title}:`, error);
                }
            }
        }
    }

    // Calculate daily averages (for the days we have data)
    const daysWithData = weeklyPlan.days ? weeklyPlan.days.length : 1;
    const avgCalories = totalMeals > 0 ? totalCalories / daysWithData : 0;
    const avgProtein = totalMeals > 0 ? totalProtein / daysWithData : 0;
    const avgCarbs = totalMeals > 0 ? totalCarbs / daysWithData : 0;
    const avgSodium = totalMeals > 0 ? totalSodium / daysWithData : 0;

    // Calculate Health Goals Met (simple example)
    const healthGoalsMet = totalMeals > 0 ? Math.min(4, Math.round(totalMeals / 3)) : 0;

    summaryContainer.innerHTML = `
        <div class="simple-weekly-summary">
            <div class="summary-card">
                <h4 class="summary-title"><i class="fas fa-chart-bar"></i> Weekly Summary</h4>
                <div class="summary-metrics">
                    <div class="metric-item">
                        <span class="metric-label">Days Planned</span>
                        <span class="metric-value">${daysWithData}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Meals Included</span>
                        <span class="metric-value">${totalMeals}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Avg Daily Calories</span>
                        <span class="metric-value">${Math.round(avgCalories)}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Health Goals Met</span>
                        <span class="metric-value">${healthGoalsMet}/4</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Export functions for HTML onclick handlers
window.goToPreviousStep = goToPreviousStep;
window.goToNextStep = goToNextStep;
window.generateShoppingList = generateShoppingList;
window.regeneratePlan = regeneratePlan;
window.updatePreferences = updatePreferences;
window.openRecipeModal = openRecipeModal;
window.printMealPlan = printMealPlan;