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
document.addEventListener('DOMContentLoaded', function() {
    console.log('Weekly Meal Plan initialized');
    loadUserPreferences();
    renderCurrentStep();
});

// Load saved user preferences from localStorage
function loadUserPreferences() {
    try {
        const saved = localStorage.getItem(PREFERENCES_KEY);
        if (saved) {
            userPreferences = JSON.parse(saved);
            
            // Check if we have a saved plan and preferences are complete
            const savedPlan = localStorage.getItem(STORAGE_KEY);
            if (savedPlan && isPreferencesComplete()) {
                weeklyPlan = JSON.parse(savedPlan);
                showWeeklyPlan();
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
function showWeeklyPlan() {
    document.getElementById('questionnaire-container').style.display = 'none';
    document.getElementById('weekly-plan-display').classList.add('active');
    document.getElementById('loading-spinner').classList.add('hidden');
    
    if (weeklyPlan) {
        renderWeeklyPlan();
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
        
        // Generate plan for each day
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
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
        
        showWeeklyPlan();
        
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
                
                if (data.recipes && data.recipes.length > 0) {
                    // Filter recipes based on user preferences
                    let filteredRecipes = filterRecipesByPreferences(data.recipes);
                    
                    // If filtering results in no recipes, use original list
                    if (filteredRecipes.length === 0) {
                        filteredRecipes = data.recipes;
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
        return createFallbackRecipe(mealType);
        
    } catch (error) {
        console.error('Error fetching recipe:', error);
        return createFallbackRecipe(mealType);
    }
}

// Create a fallback recipe when API fails
function createFallbackRecipe(mealType) {
    const fallbackRecipes = {
        breakfast: {
            title: "Simple Oatmeal with Berries",
            nutrition: { calories: 320, protein: 8, fat: 6, sodium: 150 },
            recipe_id: `fallback_${mealType}_${Date.now()}`
        },
        lunch: {
            title: "Garden Salad with Grilled Protein",
            nutrition: { calories: 450, protein: 25, fat: 18, sodium: 400 },
            recipe_id: `fallback_${mealType}_${Date.now()}`
        },
        dinner: {
            title: "Baked Fish with Vegetables",
            nutrition: { calories: 520, protein: 35, fat: 15, sodium: 380 },
            recipe_id: `fallback_${mealType}_${Date.now()}`
        },
        snack: {
            title: "Mixed Nuts and Fruit",
            nutrition: { calories: 180, protein: 6, fat: 12, sodium: 5 },
            recipe_id: `fallback_${mealType}_${Date.now()}`
        }
    };
    
    return fallbackRecipes[mealType] || fallbackRecipes.lunch;
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
function renderWeeklyPlan() {
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
    renderWeeklyDays();
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
function renderWeeklyDays() {
    const container = document.getElementById('weekly-days-container');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    const weekStart = new Date(weeklyPlan.weekStarting);
    
    container.innerHTML = days.map((day, index) => {
        const currentDate = new Date(weekStart);
        currentDate.setDate(weekStart.getDate() + index);
        
        const dayMeals = weeklyPlan.plan[day] || {};
        const dayDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
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
                    ${Object.keys(dayMeals).length > 0 
                        ? Object.entries(dayMeals).map(([mealType, recipe]) => 
                            renderLargeRecipeCard(mealType, recipe)
                        ).join('')
                        : '<div class="empty-meal-slot"><i class="fas fa-utensils"></i><h4>No meals planned</h4><p>Generate a meal plan to see recipes here</p></div>'
                    }
                </div>
            </div>
        `;
    }).join('');
}

// Render large recipe card
function renderLargeRecipeCard(mealType, recipe) {
    if (!recipe) {
        return `
            <div class="empty-meal-slot">
                <i class="fas fa-utensils"></i>
                <h4>No ${mealType} planned</h4>
                <p>Generate a meal plan to add recipes</p>
            </div>
        `;
    }
    
    const nutrition = recipe.nutrition || {};
    const calories = Math.round(nutrition.calories || 0);
    const protein = Math.round(nutrition.protein || 0);
    const carbs = Math.round(nutrition.carbohydrates || 0);
    const fat = Math.round(nutrition.fat || 0);
    
    // Get image URL if available
    const imageUrl = recipe.image_name ? 
        `https://tp33-data-recipe.s3.ap-southeast-2.amazonaws.com/raw/foodspics/${recipe.image_name}.jpg` : 
        null;
    
    return `
        <div class="recipe-card-large" onclick="openRecipeModal('${recipe.recipe_id}')">
            <div class="recipe-card-image">
                ${imageUrl ? 
                    `<img src="${imageUrl}" alt="${recipe.title}" onerror="this.parentElement.innerHTML='<i class=\\"fas fa-utensils placeholder-icon\\"></i>'">` :
                    '<i class="fas fa-utensils placeholder-icon"></i>'
                }
                <div class="meal-type-badge ${mealType}">${mealType}</div>
            </div>
            <div class="recipe-card-content">
                <h3 class="recipe-title-large">${recipe.title}</h3>
                <div class="recipe-nutrition-info">
                    <div class="nutrition-stat">
                        <i class="fas fa-fire"></i>
                        <span class="nutrition-value">${calories}</span>
                        <span class="nutrition-label">cal</span>
                    </div>
                    <div class="nutrition-stat">
                        <i class="fas fa-drumstick-bite"></i>
                        <span class="nutrition-value">${protein}g</span>
                        <span class="nutrition-label">protein</span>
                    </div>
                    <div class="nutrition-stat">
                        <i class="fas fa-bread-slice"></i>
                        <span class="nutrition-value">${carbs}g</span>
                        <span class="nutrition-label">carbs</span>
                    </div>
                    <div class="nutrition-stat">
                        <i class="fas fa-tint"></i>
                        <span class="nutrition-value">${fat}g</span>
                        <span class="nutrition-label">fat</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render a meal card
function renderMealCard(mealType, recipe) {
    if (!recipe) {
        return `
            <div class="meal-card">
                <div class="meal-header">${mealType.charAt(0).toUpperCase() + mealType.slice(1)}</div>
                <div class="meal-content">
                    <div class="meal-title">No recipe found</div>
                    <p>Please try regenerating the plan</p>
                </div>
            </div>
        `;
    }
    
    const nutrition = recipe.nutrition || {};
    
    return `
        <div class="meal-card">
            <div class="meal-header">${mealType.charAt(0).toUpperCase() + mealType.slice(1)}</div>
            <div class="meal-content">
                <div class="meal-title">${recipe.title}</div>
                <div class="meal-nutrition">
                    <div class="nutrition-item">
                        <i class="fas fa-fire"></i>
                        <span>${Math.round(nutrition.calories || 0)} cal</span>
                    </div>
                    <div class="nutrition-item">
                        <i class="fas fa-drumstick-bite"></i>
                        <span>${Math.round(nutrition.protein || 0)}g protein</span>
                    </div>
                </div>
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

// Open recipe modal (placeholder - connects with existing recipe modal)
function openRecipeModal(recipeId) {
    // This function should integrate with the existing recipe modal system
    // For now, we'll show an alert
    alert(`Recipe modal for ${recipeId} - This will integrate with the existing recipe modal system`);
}

// Print meal plan
function printMealPlan() {
    window.print();
}

// Export functions for HTML onclick handlers
window.goToPreviousStep = goToPreviousStep;
window.goToNextStep = goToNextStep;
window.generateShoppingList = generateShoppingList;
window.regeneratePlan = regeneratePlan;
window.updatePreferences = updatePreferences;
window.openRecipeModal = openRecipeModal;
window.printMealPlan = printMealPlan;