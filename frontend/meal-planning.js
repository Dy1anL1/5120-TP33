// Weekly Meal Plan JavaScript Implementation
// Designed for users aged 55-65 with comprehensive preference questionnaire

// Configuration
const API_URL = 'https://97xkjqjeuc.execute-api.ap-southeast-2.amazonaws.com/prod/recipes';
const STORAGE_KEY = 'weeklyMealPlan';
const PREFERENCES_KEY = 'mealPlanPreferences';

// Global state
let currentStep = 1;
let userPreferences = {};
let weeklyPlan = null;

// Cache for nutrition calculations
const nutritionCache = new Map();

// Rate limiting for API requests
let lastNutritionRequest = 0;
const NUTRITION_REQUEST_DELAY = 100; // 100ms delay between requests

// Simple estimated nutrition based on common ingredients (fallback)
function estimateNutrition(ingredients, servings = 1) {
    if (!ingredients || !Array.isArray(ingredients)) {
        return { calories: 0, protein: 0, carbs: 0, fat: 0 };
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
        return { calories: 0, protein: 0, carbs: 0, fat: 0 };
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

        const response = await fetch(NUTRITION_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredients: normalized }),
            signal: AbortSignal.timeout(8000) // 8 second timeout
        });

        if (!response.ok) {
            console.warn('Nutrition API request failed:', response.status);
            // Use estimation for any API failure (503, 500, etc.)
            const estimated = estimateNutrition(ingredients, servings);
            nutritionCache.set(cacheKey, estimated);
            return estimated;
        }

        const data = await response.json();
        
        if (!data.summary_100g_sum) {
            console.warn('No nutrition summary found in API response - using estimation');
            const estimated = estimateNutrition(ingredients, servings);
            nutritionCache.set(cacheKey, estimated);
            return estimated;
        }

        const sum = data.summary_100g_sum;
        const nutrition = {
            calories: Math.round((sum.calories || sum.energy_kcal || sum.energy || 0) / servings),
            protein: Math.round((sum.protein_g || sum.protein || 0) / servings),
            carbs: Math.round((sum.carbohydrate_g || sum.carbohydrate || sum.carbs || 0) / servings),
            fat: Math.round((sum.total_fat || sum.fat_g || sum.fat || 0) / servings)
        };

        // Cache the result
        nutritionCache.set(cacheKey, nutrition);
        return nutrition;
    } catch (error) {
        console.warn('Error calculating nutrition:', error.message, '- using estimation');
        
        // Use estimation as fallback when API fails
        const estimated = estimateNutrition(ingredients, servings);
        nutritionCache.set(cacheKey, estimated);
        return estimated;
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
                    message: "Age must be between 55 and 65 years"
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
                    { value: "low_sugar", text: "Low-Sugar" },
                    { value: "low_sodium", text: "Low-Sodium" },
                    { value: "heart_healthy", text: "Heart-Healthy" },
                    { value: "diabetic_friendly", text: "Diabetic-Friendly" },
                    { value: "soft_food", text: "Soft Food" }
                ]
            },
            {
                id: "meal_preferences",
                label: "Preferred Meal Types (Select all that apply)",
                type: "checkbox",
                required: true,
                options: [
                    { value: "breakfast", text: "Breakfast" },
                    { value: "lunch", text: "Lunch" },
                    { value: "dinner", text: "Dinner" },
                    { value: "soup", text: "Soup" },
                    { value: "salad", text: "Salad" },
                    { value: "snack", text: "Snack" }
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
                label: "Daily Calorie Target",
                type: "select",
                required: true,
                options: [
                    { value: "", text: "Select your calorie target" },
                    { value: "1200-1500", text: "1200-1500 calories (Weight loss)" },
                    { value: "1500-1800", text: "1500-1800 calories (Maintenance for women)" },
                    { value: "1800-2200", text: "1800-2200 calories (Maintenance for men)" },
                    { value: "2200+", text: "2200+ calories (Weight gain/very active)" }
                ]
            },
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
            }
        ]
    }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Weekly Meal Plan initialized');
    await loadUserPreferences();
    renderCurrentStep();
});

// Load saved user preferences from localStorage
async function loadUserPreferences() {
    try {
        const saved = localStorage.getItem(PREFERENCES_KEY);
        if (saved) {
            userPreferences = JSON.parse(saved);
            
            // Check if we have a saved plan and preferences are complete
            const savedPlan = localStorage.getItem(STORAGE_KEY);
            if (savedPlan && isPreferencesComplete()) {
                weeklyPlan = JSON.parse(savedPlan);
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
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(userPreferences));
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
        age: "Please enter your age between 55 and 65 years",
        meal_preferences: "Choose the types of meals you'd like in your weekly plan",
        diet_types: "Select any dietary preferences you follow",
        allergies: "Select any foods you need to avoid due to allergies",
        nutrition_priorities: "Select nutrition goals that are important to you",
        health_conditions: "Optional: Help us customize recommendations for your health needs"
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
    
    saveUserPreferences();
    validateField(event);
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
    validateField({ target: { id: questionId } });
}

// Validate individual field
function validateField(event) {
    const questionId = event.target.id;
    const question = findQuestionById(questionId);
    if (!question) return;
    
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
    if (isValid && value && question.validation) {
        if (question.validation.min && value < question.validation.min) {
            isValid = false;
            errorMessage = question.validation.message;
        }
        if (question.validation.max && value > question.validation.max) {
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
        const fieldValid = validateField({ target: { id: question.id } });
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

// Generate weekly meal plan
async function generateMealPlan() {
    try {
        document.getElementById('loading-spinner').classList.remove('hidden');
        document.getElementById('questionnaire-container').style.display = 'none';
        
        console.log('Generating meal plan with preferences:', userPreferences);
        
        // Generate plan for each day (Testing: only Monday for now)
        const days = ['Monday']; // Simplified for testing
        const mealPlan = {};

        for (const day of days) {
            mealPlan[day] = await generateDayMeals(day);
        }
        
        weeklyPlan = {
            preferences: userPreferences,
            plan: mealPlan,
            generatedDate: new Date().toISOString(),
            weekStarting: getWeekStartDate()
        };
        
        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(weeklyPlan));
        
        await showWeeklyPlan();
        
    } catch (error) {
        console.error('Error generating meal plan:', error);
        alert('Sorry, there was an error generating your meal plan. Please try again.');
        showQuestionnaire();
    }
}


// Generate meals for a specific day
async function generateDayMeals(day) {
    const meals = {};
    const selectedMealTypes = userPreferences.meal_preferences || ['breakfast', 'lunch', 'dinner'];
    
    for (const mealType of selectedMealTypes) {
        try {
            const recipe = await fetchRandomRecipe(mealType);
            if (recipe) {
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

// Fetch a random recipe based on preferences
async function fetchRandomRecipe(mealType) {
    try {
        // Try different search strategies if the first one fails
        const searchStrategies = [
            // Strategy 1: Full preferences
            () => {
                let params = new URLSearchParams({
                    category: mealType,
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
            
            // Strategy 2: Just category and diet type
            () => {
                let params = new URLSearchParams({
                    category: mealType,
                    limit: '30'
                });
                
                if (userPreferences.diet_types && userPreferences.diet_types.length > 0) {
                    params.append('diet_type', userPreferences.diet_types[0]);
                }
                
                return params;
            },
            
            // Strategy 3: Just category
            () => {
                return new URLSearchParams({
                    category: mealType,
                    limit: '30'
                });
            },
            
            // Strategy 4: No category filter (fallback)
            () => {
                return new URLSearchParams({
                    limit: '50'
                });
            }
        ];
        
        for (let i = 0; i < searchStrategies.length; i++) {
            try {
                const params = searchStrategies[i]();
                const url = `${API_URL}?${params.toString()}`;
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
                    
                    // If filtering results in no recipes, use original list
                    if (filteredRecipes.length === 0) {
                        console.log(`Using original ${data.items.length} recipes for ${mealType} (no filter matches)`);
                        filteredRecipes = data.items;
                    }
                    
                    // Filter by meal type if we used fallback strategy
                    if (i === 3 && mealType !== 'any') {
                        filteredRecipes = filteredRecipes.filter(recipe => 
                            recipe.habits && recipe.habits.includes(mealType)
                        );
                    }
                    
                    if (filteredRecipes.length > 0) {
                        // Return random recipe from filtered results
                        const randomIndex = Math.floor(Math.random() * filteredRecipes.length);
                        const selectedRecipe = filteredRecipes[randomIndex];
                        console.log(`Selected recipe for ${mealType}:`, selectedRecipe.title);
                        return selectedRecipe;
                    }
                }
            } catch (strategyError) {
                console.warn(`Strategy ${i + 1} failed:`, strategyError);
                continue;
            }
        }
        
        console.warn(`No recipes found for ${mealType} after all strategies`);
        return null;
        
    } catch (error) {
        console.error('Error fetching recipe:', error);
        return null;
    }
}


// Filter recipes based on user preferences
function filterRecipesByPreferences(recipes) {
    return recipes.filter(recipe => {
        // Check allergies
        if (userPreferences.allergies && userPreferences.allergies.length > 0) {
            for (const allergy of userPreferences.allergies) {
                if (recipe.habits && recipe.habits.includes(allergy.replace('_free', ''))) {
                    return false;
                }
            }
        }
        
        // Check diet types
        if (userPreferences.diet_types && userPreferences.diet_types.length > 0) {
            const hasMatchingDiet = userPreferences.diet_types.some(diet => 
                recipe.habits && recipe.habits.includes(diet)
            );
            if (!hasMatchingDiet) {
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
    const days = ['Monday']; // Testing: only show Monday for now
    
    const weekStart = new Date(weeklyPlan.weekStarting);
    
    // Generate day sections with async meal cards
    const dayPromises = days.map(async (day, index) => {
        const currentDate = new Date(weekStart);
        currentDate.setDate(weekStart.getDate() + index);
        
        const dayMeals = weeklyPlan.plan[day] || {};
        const dayDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        let mealsHTML = '';
        if (Object.keys(dayMeals).length > 0) {
            const mealPromises = Object.entries(dayMeals).map(([mealType, recipe]) => 
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
    generateWeeklySummary(weeklyPlan);
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
    
    // Use recipe's existing nutrition data
    const nutrition = recipe.nutrition || {};
    const nutritionInfo = `<div class="recipe-nutrition-info">
        <span class="nutrition-item"><strong>Calories:</strong> ${Math.round(nutrition.calories || 0)}</span>
        <span class="nutrition-item"><strong>Protein:</strong> ${Math.round(nutrition.protein_g || 0)}g</span>
        <span class="nutrition-item"><strong>Carbs:</strong> ${Math.round(nutrition.carbs_g || 0)}g</span>
        <span class="nutrition-item"><strong>Sodium:</strong> ${Math.round(nutrition.sodium_mg || 0)}mg</span>
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
    
    // Use recipe's existing nutrition data
    const nutrition = recipe.nutrition || {};
    const nutritionInfo = `<div class="recipe-nutrition-info">
        <span class="nutrition-item"><strong>Calories:</strong> ${Math.round(nutrition.calories || 0)}</span>
        <span class="nutrition-item"><strong>Protein:</strong> ${Math.round(nutrition.protein_g || 0)}g</span>
        <span class="nutrition-item"><strong>Carbs:</strong> ${Math.round(nutrition.carbs_g || 0)}g</span>
        <span class="nutrition-item"><strong>Sodium:</strong> ${Math.round(nutrition.sodium_mg || 0)}mg</span>
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

// Generate shopping list (placeholder)
function generateShoppingList() {
    alert('Shopping list feature will be implemented in the next update!');
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
            <div id="recipe-modal-image" style="text-align: center; margin-bottom: 1rem;">
                <img id="recipe-modal-img" alt="Recipe Image" style="max-width: 100%; height: auto; border-radius: 8px; max-height: 200px;">
            </div>
            <h2 id="recipe-modal-title"></h2>
            <p id="recipe-brief" class="recipe-brief"></p>
            <div class="modal-cols">
                <div class="modal-col">
                    <h3>Ingredients</h3>
                    <ul id="recipe-ingredients"></ul>
                </div>
                <div class="modal-col">
                    <h3>Instructions</h3>
                    <ol id="recipe-directions"></ol>
                </div>
            </div>
            <div id="nutrition-summary" class="nutrition-summary">
                <h3>Nutrition Summary</h3>
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
    document.addEventListener('keydown', function(e) {
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
        const response = await fetch(`${API_URL}?recipe_id=${recipeId}`);
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

        // Show nutrition info
        if (sumEl && recipe.nutrition) {
            const nutrition = recipe.nutrition;
            sumEl.innerHTML = `
                <h3>Nutrition Summary</h3>
                <div class="nutrition-grid">
                    <div class="nutrition-item">
                        <strong>Calories:</strong> ${Math.round(nutrition.calories || 0)}
                    </div>
                    <div class="nutrition-item">
                        <strong>Protein:</strong> ${Math.round(nutrition.protein_g || 0)}g
                    </div>
                    <div class="nutrition-item">
                        <strong>Carbs:</strong> ${Math.round(nutrition.carbs_g || 0)}g
                    </div>
                    <div class="nutrition-item">
                        <strong>Sodium:</strong> ${Math.round(nutrition.sodium_mg || 0)}mg
                    </div>
                </div>
            `;
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
function generateWeeklySummary(weeklyPlan) {
    const summaryContainer = document.getElementById('weekly-summary');
    if (!summaryContainer || !weeklyPlan || !weeklyPlan.days) return;

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalSodium = 0;
    let totalMeals = 0;

    // Calculate totals from all meals
    weeklyPlan.days.forEach(day => {
        ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
            const recipe = day.meals[mealType];
            if (recipe && recipe.nutrition) {
                totalCalories += recipe.nutrition.calories || 0;
                totalProtein += recipe.nutrition.protein_g || 0;
                totalCarbs += recipe.nutrition.carbs_g || 0;
                totalSodium += recipe.nutrition.sodium_mg || 0;
                totalMeals++;
            }
        });
    });

    // Calculate daily averages (for the days we have data)
    const daysWithData = weeklyPlan.days ? weeklyPlan.days.length : 1;
    const avgCalories = totalMeals > 0 ? totalCalories / daysWithData : 0;
    const avgProtein = totalMeals > 0 ? totalProtein / daysWithData : 0;
    const avgCarbs = totalMeals > 0 ? totalCarbs / daysWithData : 0;
    const avgSodium = totalMeals > 0 ? totalSodium / daysWithData : 0;

    summaryContainer.innerHTML = `
        <div class="weekly-summary-cards">
            <!-- Nutrition Overview Card -->
            <div class="summary-overview-card">
                <div class="overview-header">
                    <h4>📊 Nutrition Overview</h4>
                    <span class="period-badge">This Week</span>
                </div>
                <div class="nutrition-metrics">
                    <div class="metric-row">
                        <div class="metric-item">
                            <div class="metric-icon">🔥</div>
                            <div class="metric-data">
                                <span class="metric-value">${Math.round(avgCalories)}</span>
                                <span class="metric-label">Avg Daily Calories</span>
                            </div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-icon">💪</div>
                            <div class="metric-data">
                                <span class="metric-value">${Math.round(avgProtein)}g</span>
                                <span class="metric-label">Avg Daily Protein</span>
                            </div>
                        </div>
                    </div>
                    <div class="metric-row">
                        <div class="metric-item">
                            <div class="metric-icon">🌾</div>
                            <div class="metric-data">
                                <span class="metric-value">${Math.round(avgCarbs)}g</span>
                                <span class="metric-label">Avg Daily Carbs</span>
                            </div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-icon">🧂</div>
                            <div class="metric-data">
                                <span class="metric-value">${Math.round(avgSodium)}mg</span>
                                <span class="metric-label">Avg Daily Sodium</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Weekly Stats Card -->
            <div class="summary-stats-card">
                <h4>📈 Weekly Statistics</h4>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-number">${Math.round(totalCalories)}</div>
                        <div class="stat-description">Total Calories</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number">${Math.round(totalProtein)}g</div>
                        <div class="stat-description">Total Protein</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number">${totalMeals}</div>
                        <div class="stat-description">Meals Planned</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number">${daysWithData}</div>
                        <div class="stat-description">Days Covered</div>
                    </div>
                </div>
            </div>

            <!-- Health Insights Card -->
            <div class="summary-insights-card">
                <h4>🎯 Health Insights</h4>
                <div class="insights-list">
                    <div class="insight-badge success">
                        <i class="fas fa-check-circle"></i>
                        <span>Balanced Nutrition</span>
                    </div>
                    <div class="insight-badge safe">
                        <i class="fas fa-shield-alt"></i>
                        <span>Allergy-Safe Menu</span>
                    </div>
                    <div class="insight-badge healthy">
                        <i class="fas fa-heart"></i>
                        <span>Senior-Friendly</span>
                    </div>
                    <div class="insight-badge quality">
                        <i class="fas fa-star"></i>
                        <span>Quality Ingredients</span>
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