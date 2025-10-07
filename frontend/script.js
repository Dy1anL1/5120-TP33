// ====== API Configuration ======
// Note: API endpoints are now defined in config.js

// Format nutrition numbers to show 1-2 decimal places, avoiding zeros
function formatNutritionNumber(value, unit = '') {
    // Apply nutrition value validation before formatting
    let adjustedValue = value;

    // Determine nutrient type from unit for validation
    let nutrientType = 'Unknown';
    if (unit === 'mg' && (value > 1000)) nutrientType = 'Sodium'; // High mg values likely sodium
    else if (unit === 'kcal' || unit === '') nutrientType = 'Calories';
    else if (unit === 'g' && value > 50) nutrientType = 'Protein';

    // Apply sanity checks if we detected a nutrient type
    if (nutrientType !== 'Unknown') {
        adjustedValue = adjustNutritionValue(value, nutrientType);
    }

    const num = Number(adjustedValue) || 0;

    // Add indicator if value was adjusted
    const wasAdjusted = Math.abs(Number(value) - num) > 0.1;
    const prefix = wasAdjusted ? '~' : '';

    if (num === 0) return `0${unit}`;
    if (num < 0.1) return `${prefix}<0.1${unit}`;
    if (num < 1) return `${prefix}${num.toFixed(2)}${unit}`;
    if (num < 10) return `${prefix}${num.toFixed(1)}${unit}`;
    return `${prefix}${Math.round(num)}${unit}`;
}

// ====== Compact Nutrition Goals (10 key nutrients for dashboard) ======
const NUTRIENT_GOALS = {
    female_51: {
        calories_kcal: 1800,
        protein_g: 46,
        carbohydrate_g: 130,
        total_fat_pct_range: '20-35',
        fiber_g: 22.4,
        calcium_mg: 1200,
        potassium_mg: 4700,
        sodium_mg: 2300,
        vitaminD_IU: 600,
        vitaminB12_mcg: 2.4
    },
    male_51: {
        calories_kcal: 2200,
        protein_g: 56,
        carbohydrate_g: 130,
        total_fat_pct_range: '20-35',
        fiber_g: 28,
        calcium_mg: 1200,
        potassium_mg: 4700,
        sodium_mg: 2300,
        vitaminD_IU: 600,
        vitaminB12_mcg: 2.4
    }
};

// ====== Nutrition Data Quality Assessment ======
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

// Modal helpers
function ensureRecipeModal() {
    let m = document.getElementById('recipe-modal');
    if (m) return m;
    // Fallback: inject modal if missing
    const tpl = `
    <div id="recipe-modal" class="modal" aria-hidden="true" style="display:none">
        <div class="modal-backdrop"></div>
        <div class="modal-card recipe-modal-new" role="dialog" aria-modal="true" aria-labelledby="recipe-modal-title">
            <button class="modal-close" aria-label="Close">&times;</button>

            <!-- Hero Image Header -->
            <div id="recipe-modal-image" class="recipe-modal-hero">
                <img id="recipe-modal-img" src="" alt="Recipe Image" />
                <div class="recipe-modal-overlay">
                    <h2 id="recipe-modal-title" class="recipe-modal-hero-title"></h2>
                </div>
            </div>

            <!-- Category Tag -->
            <div id="recipe-category-tag" class="recipe-category-tag"></div>

            <!-- Info Cards Row -->
            <div class="recipe-info-cards">
                <div class="recipe-info-card">
                    <i class="fas fa-clock"></i>
                    <div class="info-label">Cook Time</div>
                    <div id="cook-time-value" class="info-value">30 mins</div>
                </div>
                <div class="recipe-info-card">
                    <i class="fas fa-users"></i>
                    <div class="info-label">Servings</div>
                    <div id="servings-value" class="info-value">8</div>
                </div>
            </div>

            <!-- Tabs -->
            <div class="recipe-modal-tabs">
                <button class="recipe-tab active" data-tab="ingredients">
                    <i class="fas fa-list-ul"></i> Ingredients
                </button>
                <button class="recipe-tab" data-tab="instructions">
                    <i class="fas fa-tasks"></i> Instructions
                </button>
                <button class="recipe-tab" data-tab="nutrition">
                    <i class="fas fa-heartbeat"></i> Nutrition
                </button>
            </div>

            <!-- Tab Content -->
            <div class="recipe-modal-content">
                <div id="tab-ingredients" class="recipe-tab-content active">
                    <ul id="recipe-ingredients" class="recipe-ingredients-list"></ul>
                </div>
                <div id="tab-instructions" class="recipe-tab-content">
                    <ol id="recipe-directions" class="recipe-instructions-list"></ol>
                </div>
                <div id="tab-nutrition" class="recipe-tab-content">
                    <div id="nutrition-summary" class="nutrition-grid"></div>
                    <button id="add-to-dashboard" class="btn btn-primary" style="margin-top:1.5rem;width:100%;">Add to Nutrition Dashboard</button>
                    <button id="view-dashboard" class="btn btn-secondary" style="margin-top:0.75rem;width:100%;">View Nutrition Dashboard</button>
                </div>
            </div>
        </div>
    </div>`;
    const host = document.createElement('div');
    host.innerHTML = tpl;
    document.body.appendChild(host.firstElementChild);

    // Add tab switching functionality
    const modal = document.getElementById('recipe-modal');
    const tabs = modal.querySelectorAll('.recipe-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;

            // Remove active class from all tabs and contents
            modal.querySelectorAll('.recipe-tab').forEach(t => t.classList.remove('active'));
            modal.querySelectorAll('.recipe-tab-content').forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            modal.querySelector(`#tab-${targetTab}`).classList.add('active');
        });
    });

    return modal;
}

function openModal() {
    const m = ensureRecipeModal();
    m.setAttribute('aria-hidden', 'false');
    m.style.display = 'block';
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    const m = document.getElementById('recipe-modal');
    if (!m) return;
    m.setAttribute('aria-hidden', 'true');
    m.style.display = 'none';
    document.body.style.overflow = '';
}

// Unified close event
document.addEventListener('click', (e) => {
    if (e.target.closest('.modal-close') || e.target.classList.contains('modal-backdrop')) {
        closeModal();
    }
});

// Open recipe modal and fetch nutrition summary
async function openRecipeModal(recipe) {
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
        imgContainerEl.style.display = 'block';
    } else if (imgContainerEl) {
        imgContainerEl.style.display = 'none';
    }

    // Fill info cards
    const cookTimeEl = m.querySelector('#cook-time-value');
    const servingsEl = m.querySelector('#servings-value');
    const categoryTagEl = m.querySelector('#recipe-category-tag');

    if (cookTimeEl) {
        const totalTime = recipe.cooking_time || recipe.cook_time || recipe.total_time || null;
        cookTimeEl.textContent = totalTime ? (totalTime >= 60 ? `${Math.floor(totalTime/60)} hrs ${totalTime%60 ? (totalTime%60)+' mins' : ''}` : `${totalTime} mins`) : '-';
    }

    if (servingsEl) {
        servingsEl.textContent = recipe.servings || recipe.yield || 4;
    }

    // Show seasonal ingredients tags (if available from seasonal-produce page)
    if (categoryTagEl) {
        if (typeof getRecipeSeasonalIngredients === 'function') {
            const seasonalIngs = getRecipeSeasonalIngredients(recipe);
            if (seasonalIngs && seasonalIngs.length > 0) {
                categoryTagEl.innerHTML = seasonalIngs.map(ing =>
                    `<span class="seasonal-tag-item">${ing}</span>`
                ).join('');
                categoryTagEl.style.display = 'block';
            } else {
                categoryTagEl.style.display = 'none';
            }
        } else {
            // Fallback to category if not on seasonal page
            if (recipe.categories && recipe.categories.length > 0) {
                categoryTagEl.innerHTML = `<span class="seasonal-tag-item">${recipe.categories[0]}</span>`;
                categoryTagEl.style.display = 'block';
            } else {
                categoryTagEl.style.display = 'none';
            }
        }
    }

    if (ingEl) {
        ingEl.innerHTML = '';
        (recipe.ingredients || []).forEach(s => {
            const li = document.createElement('li'); li.textContent = s; ingEl.appendChild(li);
        });
    }

    if (dirEl) {
        dirEl.innerHTML = '';
        // Handle both directions (old format) and instructions (new format)
        let instructionsText = '';
        if (recipe.instructions && typeof recipe.instructions === 'string') {
            instructionsText = recipe.instructions;
        } else if (Array.isArray(recipe.directions) && recipe.directions.length > 0) {
            instructionsText = recipe.directions.join(' ');
        } else if (Array.isArray(recipe.instructions) && recipe.instructions.length > 0) {
            instructionsText = recipe.instructions.join(' ');
        }

        if (instructionsText) {
            // Split by periods and filter out empty steps
            const steps = instructionsText
                .split(/\.\s+/)
                .map(step => step.trim())
                .filter(step => step.length > 0)
                .map(step => step.endsWith('.') ? step : step + '.');

            steps.forEach(step => {
                const li = document.createElement('li');
                li.textContent = step;
                dirEl.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'No instructions available';
            dirEl.appendChild(li);
        }
    }
    if (sumEl) sumEl.innerHTML = '<div class="card"><div class="key">Loading...</div><div class="val">...</div></div>';

    openModal();

    // Nutrition API
    try {
        const ingredients = (recipe.ingredients || []).map(String);
        if (ingredients.length) {
            const res = await fetch(API_CONFIG.NUTRITION_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ingredients })
            });
            const body = await res.json();
            const summary = body.summary_100g_sum || {};
            if (Object.keys(summary).length === 0) {
                if (sumEl) sumEl.innerHTML = '<div style="color:#888;">No nutrition matches found for listed ingredients.</div>';
            } else {
                if (sumEl) {
                    sumEl.innerHTML = '';

                    // Get servings for per-serving calculation
                    const servings = recipe.servings || recipe.yield || 4; // Default to 4 servings

                    const pairs = [
                        { keys: ['calories'], unit: 'kcal', label: 'calories' },
                        { keys: ['protein'], unit: 'g', label: 'protein' },
                        { keys: ['total_fat'], unit: 'g', label: 'fat' },
                        { keys: ['carbohydrates'], unit: 'g', label: 'carbohydrates' },
                        { keys: ['dietary_fiber'], unit: 'g', label: 'fiber' },
                        { keys: ['total_sugars'], unit: 'g', label: 'sugars' },
                        { keys: ['saturated_fats'], unit: 'g', label: 'saturated fats' },
                        { keys: ['trans_fats'], unit: 'g', label: 'trans fats' },
                        { keys: ['vitamin_d'], unit: 'IU', label: 'vitamin D' },
                        { keys: ['calcium'], unit: 'mg', label: 'calcium' },
                        { keys: ['iron'], unit: 'mg', label: 'iron' },
                        { keys: ['potassium'], unit: 'mg', label: 'potassium' }
                    ];
                    pairs.forEach(p => {
                        const v = getAny(summary, p.keys);
                        if (v == null) return;

                        // Divide by servings to get per-serving nutrition values
                        const perServingValue = v / servings;

                        // Apply nutrition value validation before display
                        const labelForValidation = p.label.charAt(0).toUpperCase() + p.label.slice(1);
                        const adjustedValue = adjustNutritionValue(perServingValue, labelForValidation);

                        const card = document.createElement('div'); card.className = 'card';

                        // Show indicator if value was adjusted
                        const wasAdjusted = Math.abs(perServingValue - adjustedValue) > 0.1;
                        const prefix = wasAdjusted ? '~' : '';

                        card.innerHTML = `<div class="key">${p.label}</div><div class="val">${prefix}${fmt(adjustedValue)} ${p.unit}</div>`;
                        sumEl.appendChild(card);
                    });
                }
            }
        } else if (sumEl) {
            sumEl.innerHTML = '<div class="card"><div class="key">No ingredients</div><div class="val">-</div></div>';
        }
    } catch (err) {
        if (sumEl) sumEl.innerHTML = `<div style="color:#c00;">${err.message}</div>`;
    }

    // Add to Dashboard
    const addBtn = m.querySelector('#add-to-dashboard');
    if (addBtn) {
        // Update button text based on current count for this specific recipe
        const updateButtonText = () => {
            const day = todayKey();
            const todaysRecipes = readDashboard().filter(x => x.day === day);
            const thisRecipeCount = todaysRecipes.filter(x => x.recipe_id === recipe.recipe_id).length;

            if (thisRecipeCount >= 3) {
                addBtn.textContent = `Recipe Limit Reached (${thisRecipeCount}/3)`;
                addBtn.disabled = true;
                addBtn.style.background = '#888';
            } else {
                addBtn.textContent = `Add to Dashboard (${thisRecipeCount}/3)`;
                addBtn.disabled = false;
                addBtn.style.background = '';
            }
        };

        // Initial update
        updateButtonText();

        addBtn.onclick = () => {
            const day = todayKey();
            const todaysRecipes = readDashboard().filter(x => x.day === day);
            const thisRecipeCount = todaysRecipes.filter(x => x.recipe_id === recipe.recipe_id).length;

            // Check if this recipe limit reached
            if (thisRecipeCount >= 3) {
                addBtn.textContent = 'Recipe Limit Reached (3/3)';
                return;
            }

            // Get nutrition summary, use calories if available, otherwise null
            let calories = null;
            const sumEl = m.querySelector('#nutrition-summary');
            if (sumEl) {
                const calCard = sumEl.querySelector('.card .key')?.textContent?.toLowerCase() === 'calories'
                    ? sumEl.querySelector('.card .val')?.textContent
                    : null;
                if (calCard && !isNaN(Number(calCard))) calories = Number(calCard);
            }
            addToDashboard({
                recipe_id: recipe.recipe_id,
                title: recipe.title,
                ingredients: recipe.ingredients || [],
                servings: recipe.servings || recipe.yield || 4,
                calories,
                added_at: Date.now(),
                day
            });

            // Update button text with new count for this recipe
            const newCount = thisRecipeCount + 1;
            addBtn.textContent = `Added! (${newCount}/3)`;
            addBtn.disabled = true;
            addBtn.style.background = '#4CAF50';

            setTimeout(() => {
                updateButtonText();
            }, 1200);
        };
    }

    // View Dashboard button
    const viewBtn = m.querySelector('#view-dashboard');
    if (viewBtn) {
        viewBtn.onclick = () => {
            window.location.href = 'nutrition-dashboard.html';
        };
    }
}

// ====== Nutrition Dashboard Integration ======
// ====== Dashboard Nutrition Rendering ======
const DASHBOARD_KEY = 'nss_dashboard';

function todayKey() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function readDashboard() {
    try { return JSON.parse(localStorage.getItem(DASHBOARD_KEY)) || []; }
    catch { return []; }
}

function writeDashboard(list) {
    localStorage.setItem(DASHBOARD_KEY, JSON.stringify(list || []));
}

function addToDashboard(item) {
    const list = readDashboard();
    // Add unique identifier to each dashboard entry
    const uniqueItem = {
        ...item,
        dashboard_entry_id: Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    };
    list.push(uniqueItem);
    writeDashboard(list);
}

function removeFromDashboardByIdAndDay(recipe_id, day) {
    const list = readDashboard();
    const next = list.filter(x => !(String(x.recipe_id) === String(recipe_id) && x.day === day));
    writeDashboard(next);
    return
}

function removeFromDashboardByEntryId(dashboard_entry_id) {
    const list = readDashboard();
    const next = list.filter(x => x.dashboard_entry_id !== dashboard_entry_id);
    writeDashboard(next);
    return
}

function clearAllMealsForDay(day) {
    const list = readDashboard();
    const next = list.filter(x => x.day !== day);
    writeDashboard(next);
    return
}

async function renderDashboardNutrition() {
    const dashDiv = document.getElementById('dashboard-nutrition');
    if (!dashDiv) return;
    dashDiv.innerHTML = '<div style="text-align:center;color:#888;">Loading dashboard nutrition...</div>';
    // Main card hooks
    const caloriesCurrent = document.getElementById('calories-current');
    const caloriesGoal = document.getElementById('calories-goal');
    const proteinCurrent = document.getElementById('protein-current');
    const proteinGoal = document.getElementById('protein-goal');
    const calciumCurrent = document.getElementById('calcium-current');
    const calciumGoal = document.getElementById('calcium-goal');
    const vitaminDCurrent = document.getElementById('vitamin_d-current');
    const vitaminDGoal = document.getElementById('vitamin_d-goal');
    const overallProgress = document.getElementById('overall-progress');
    const overallProgressText = document.getElementById('overall-progress-text');
    // Progress bar
    const progressFill = document.querySelector('.progress-fill');
    let allIngredients = [];

    try {
        // Read dashboard from localStorage
        let dashboard = [];
        try {
            dashboard = JSON.parse(localStorage.getItem(DASHBOARD_KEY)) || [];
        } catch { }
        if (!Array.isArray(dashboard) || dashboard.length === 0) {
            dashDiv.innerHTML = '<div style="color:#888;text-align:center;">No dashboard recipes found.</div>';

            // Reset all nutrition values to zero when no meals
            if (caloriesCurrent) caloriesCurrent.textContent = '0';
            if (proteinCurrent) proteinCurrent.textContent = '0';
            if (calciumCurrent) calciumCurrent.textContent = '0';
            if (vitaminDCurrent) vitaminDCurrent.textContent = '0';
            if (overallProgress) overallProgress.textContent = '0%';
            if (overallProgressText) overallProgressText.textContent = '0%';
            if (progressFill) {
                progressFill.style.width = '0%';
                progressFill.style.background = '';
            }

            // Reset progress bars in cards
            const cardFields = [
                { curId: 'calories-current', goalId: 'calories-goal' },
                { curId: 'protein-current', goalId: 'protein-goal' },
                { curId: 'calcium-current', goalId: 'calcium-goal' },
                { curId: 'vitamin_d-current', goalId: 'vitamin_d-goal' },
            ];
            cardFields.forEach(({ curId, goalId }) => {
                const curEl = document.getElementById(curId);
                const card = curEl?.closest('.nutrition-card');
                if (card) {
                    const fill = card.querySelector('.progress-fill');
                    if (fill) {
                        fill.style.width = '0%';
                        fill.style.background = '';
                    }
                    curEl.style.color = '';
                    card.classList.remove('over-goal');
                }
            });

            // Clear all nutrition alerts when no meals
            clearAllNutritionAlerts();

            return;
        }

        // Calculate nutrition for each recipe separately and sum them up
        // This fixes the serving size calculation issue
        let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalFiber = 0, totalSugars = 0, totalSaturatedFat = 0, totalTransFat = 0, totalVitaminD = 0, totalCalcium = 0, totalIron = 0, totalPotassium = 0;

        for (const item of dashboard) {
            if (!Array.isArray(item.ingredients) || item.ingredients.length === 0) continue;

            try {
                const nutri = await fetchNutrition(item.ingredients);
                const recipeSum = nutri.summary_100g_sum || {};

                // Get servings info - assume 1 serving per dashboard item since users add individual servings
                const servings = 1; // Each dashboard item represents one serving

                // Calculate per-serving values for dashboard

                // Add per-serving nutrition values to totals
                const recipeServings = item.servings || item.yield || 4; // Default recipe serves 4
                totalCalories += (getAny(recipeSum, ['calories']) || 0) / recipeServings;
                totalProtein += (getAny(recipeSum, ['protein']) || 0) / recipeServings;
                totalCarbs += (getAny(recipeSum, ['carbohydrates']) || 0) / recipeServings;
                totalFat += (getAny(recipeSum, ['total_fat']) || 0) / recipeServings;
                totalFiber += (getAny(recipeSum, ['dietary_fiber']) || 0) / recipeServings;
                totalSugars += (getAny(recipeSum, ['total_sugars']) || 0) / recipeServings;
                totalSaturatedFat += (getAny(recipeSum, ['saturated_fats']) || 0) / recipeServings;
                totalTransFat += (getAny(recipeSum, ['trans_fats']) || 0) / recipeServings;
                totalVitaminD += (getAny(recipeSum, ['vitamin_d']) || 0) / recipeServings;
                totalCalcium += (getAny(recipeSum, ['calcium']) || 0) / recipeServings;
                totalIron += (getAny(recipeSum, ['iron']) || 0) / recipeServings;
                totalPotassium += (getAny(recipeSum, ['potassium']) || 0) / recipeServings;

            } catch (error) {
                console.warn(`Failed to get nutrition for dashboard recipe:`, error);
            }
        }

        // Use calculated totals instead of raw API response
        const sum = {
            calories: totalCalories,
            protein: totalProtein,
            carbohydrates: totalCarbs,
            total_fat: totalFat,
            dietary_fiber: totalFiber,
            total_sugars: totalSugars,
            saturated_fats: totalSaturatedFat,
            trans_fats: totalTransFat,
            vitamin_d: totalVitaminD,
            calcium: totalCalcium,
            iron: totalIron,
            potassium: totalPotassium
        };

        // Initialize details array (empty for dashboard summary)
        const details = [];

        // Main nutrition display is handled by the fields loop below
        // Goals (can be static or configurable)
        const calGoal = caloriesGoal ? Number(caloriesGoal.textContent) : 2200;
        const proGoal = proteinGoal ? Number(proteinGoal.textContent) : 56;
        // Calcium and vitamin D goals
        const calciumGoalVal = calciumGoal ? Number(calciumGoal.textContent) : 1200;
        const vitaminDGoalVal = vitaminDGoal ? Number(vitaminDGoal.textContent) : 600;

        // Set current nutrition values
        if (caloriesCurrent) caloriesCurrent.textContent = Math.round(totalCalories);
        if (proteinCurrent) proteinCurrent.textContent = Math.round(totalProtein);
        if (calciumCurrent) calciumCurrent.textContent = Math.round(totalCalcium);
        if (vitaminDCurrent) vitaminDCurrent.textContent = Math.round(totalVitaminD);

        // Progress calculation (simple average)
        let percent = 0;
        let count = 0;
        if (totalCalories != null) { percent += Math.min(totalCalories / calGoal, 1); count++; }
        if (totalProtein != null) { percent += Math.min(totalProtein / proGoal, 1); count++; }
        if (totalCalcium != null) { percent += Math.min(totalCalcium / calciumGoalVal, 1); count++; }
        if (totalVitaminD != null) { percent += Math.min(totalVitaminD / vitaminDGoalVal, 1); count++; }
        percent = count ? Math.round((percent / count) * 100) : 0;
        if (overallProgress) overallProgress.textContent = percent + '%';
        if (overallProgressText) overallProgressText.textContent = percent + '%';
        if (progressFill) {
            // set width and color when exceeding 100%
            progressFill.style.width = Math.min(100, percent) + '%';
            progressFill.style.background = percent > 100 ? '#e53935' : '';
        }

        // Update progress header message when goals reached
        const progWarnSpan = document.querySelector('.progress-warning span');
        if (progWarnSpan) {
            if (percent >= 100) progWarnSpan.textContent = 'Great job - you\'ve reached your daily goals!';
            else progWarnSpan.textContent = 'Keep logging meals to reach your goals';
        }

        // Per-card visual: mark numbers/progress red when current > goal
        const cardFields = [
            { curId: 'calories-current', goalId: 'calories-goal' },
            { curId: 'protein-current', goalId: 'protein-goal' },
            { curId: 'calcium-current', goalId: 'calcium-goal' },
            { curId: 'vitamin_d-current', goalId: 'vitamin_d-goal' },
        ];
        cardFields.forEach(({ curId, goalId }) => {
            const curEl = document.getElementById(curId);
            const goalEl = document.getElementById(goalId);
            if (!curEl || !goalEl) return;
            const cur = Number(String(curEl.textContent).replace(/[^0-9\.\-]/g, '')) || 0;
            const goal = Number(String(goalEl.textContent).replace(/[^0-9\.\-]/g, '')) || 0 || 1;
            const card = curEl.closest('.nutrition-card');
            if (card) {
                const fill = card.querySelector('.progress-fill');
                const pct = goal ? (cur / goal) * 100 : 0;
                if (fill) {
                    fill.style.width = Math.min(100, pct) + '%';
                    fill.style.background = pct > 100 ? '#e53935' : '';
                }
                if (cur > goal) {
                    // red number
                    curEl.style.color = '#e53935';
                    card.classList.add('over-goal');
                } else {
                    curEl.style.color = '';
                    card.classList.remove('over-goal');
                }
            }
        });
        // Render dashboard summary below (extended nutrients)
        const fields = [
            { keys: ['calories'], label: 'Calories', icon: 'fa-fire', unit: 'kcal' },
            { keys: ['protein'], label: 'Protein', icon: 'fa-drumstick-bite', unit: 'g' },
            { keys: ['total_fat'], label: 'Total Fat', icon: 'fa-bacon', unit: 'g' },
            { keys: ['carbohydrates'], label: 'Carbs', icon: 'fa-bread-slice', unit: 'g' },
            { keys: ['dietary_fiber'], label: 'Fiber', icon: 'fa-seedling', unit: 'g' },
            { keys: ['total_sugars'], label: 'Sugars', icon: 'fa-cube', unit: 'g' },
            { keys: ['saturated_fats'], label: 'Saturated Fat', icon: 'fa-cheese', unit: 'g' },
            { keys: ['trans_fats'], label: 'Trans Fat', icon: 'fa-ban', unit: 'g' },
            { keys: ['vitamin_d'], label: 'Vitamin D', icon: 'fa-sun', unit: 'IU' },
            { keys: ['calcium'], label: 'Calcium', icon: 'fa-bone', unit: 'mg' },
            { keys: ['iron'], label: 'Iron', icon: 'fa-magnet', unit: 'mg' },
            { keys: ['potassium'], label: 'Potassium', icon: 'fa-bolt', unit: 'mg' },
        ];
        let html = '<div class="nutrition-cards">';
        fields.forEach(f => {
            const raw = getAny(sum, f.keys);
            const val = formatNutritionValue(raw, f.label);
            html += `<div class="nutrition-card">
                <div class="nutrition-icon"><i class="fas ${f.icon}"></i></div>
                <div class="nutrition-label">${f.label}</div>
                <div class="nutrition-value">${val}${f.unit ? ' ' + f.unit : ''}</div>
            </div>`;
        });
        html += '</div>';
        // Render details table
        if (details.length > 0) {
            html += '<h3 style="margin-top:2rem;">Ingredient Details</h3>';
            html += '<table class="nutrition-details-table" style="width:100%;margin-top:1rem;border-collapse:collapse;">';
            html += '<thead><tr><th>Ingredient</th><th>Calories</th><th>Protein</th><th>Fat</th><th>Fiber</th><th>Potassium</th><th>Calcium</th><th>Vit D</th><th>Iron</th><th>Sugars</th><th>Sat Fat</th></tr></thead><tbody>';
            details.forEach(d => {
                const rowCalories = getAny(d, ['calories']);
                const rowProtein = getAny(d, ['protein']);
                const rowFat = getAny(d, ['total_fat']);
                const rowFiber = getAny(d, ['dietary_fiber']);
                const rowPotassium = getAny(d, ['potassium']);
                const rowCalcium = getAny(d, ['calcium']);
                const rowVitD = getAny(d, ['vitamin_d']);
                const rowIron = getAny(d, ['iron']);
                const rowSugar = getAny(d, ['total_sugars']);
                const rowSaturatedFat = getAny(d, ['saturated_fats']);
                html += `<tr>
                    <td>${d.ingredient || '-'}</td>
                    <td>${rowCalories != null ? fmt(rowCalories) : '-'}</td>
                    <td>${rowProtein != null ? fmt(rowProtein) : '-'}</td>
                    <td>${rowFat != null ? fmt(rowFat) : '-'}</td>
                    <td>${rowFiber != null ? fmt(rowFiber) : '-'}</td>
                    <td>${rowPotassium != null ? fmt(rowPotassium) + ' mg' : '-'}</td>
                    <td>${rowCalcium != null ? fmt(rowCalcium) + ' mg' : '-'}</td>
                    <td>${rowVitD != null ? fmt(rowVitD) + ' IU' : '-'}</td>
                    <td>${rowIron != null ? fmt(rowIron) + ' mg' : '-'}</td>
                    <td>${rowSugar != null ? fmt(rowSugar) : '-'}</td>
                    <td>${rowSaturatedFat != null ? fmt(rowSaturatedFat) : '-'}</td>
                </tr>`;
            });
            html += '</tbody></table>';
        }
        dashDiv.innerHTML = html;

        // Check for nutrition excess and show alerts
        checkNutritionExcess(cardFields);
    } catch (e) {
        dashDiv.innerHTML = `<div style="color:#c00;text-align:center;">${e.message}</div>`;
    }
}

// Note: API_CONFIG.RECIPES_API is now defined in config.js as API_CONFIG.API_CONFIG.RECIPES_API

async function fetchNutrition(ingredients) {
    try {
        // Accept either array of strings or array of objects { text }
        const normalized = (ingredients || []).map(s => typeof s === 'string' ? { text: s } : s || { text: '' });
        // Infer labels for each ingredient (if not provided)
        normalized.forEach(it => { if (!it.label) it.label = inferLabelFromText(it.text || it.name || ''); });

        const res = await fetch(API_CONFIG.NUTRITION_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredients: normalized })
        });

        if (!res.ok) throw new Error('Failed to fetch nutrition');

        const data = await res.json();

        // Check for completely empty or invalid nutrition data
        const sum = data.summary_100g_sum || {};
        const hasAnyNutrition = Object.values(sum).some(val => val != null && val > 0);

        if (!hasAnyNutrition) {
            console.warn('No nutrition data returned from API, using fallback estimation');
            // Return fallback estimated nutrition based on ingredient count and types
            const estimatedNutrition = estimateNutritionFromIngredients(ingredients);
            return {
                summary_100g_sum: estimatedNutrition,
                results: [],
                note: "Estimated nutrition - original API returned no data"
            };
        }

        return data;

    } catch (error) {
        console.error('Nutrition API error:', error);
        // Return fallback nutrition estimation
        const estimatedNutrition = estimateNutritionFromIngredients(ingredients);
        return {
            summary_100g_sum: estimatedNutrition,
            results: [],
            note: "Estimated nutrition - API unavailable"
        };
    }
}

// Fallback nutrition estimation based on common ingredient patterns
function estimateNutritionFromIngredients(ingredients) {
    if (!ingredients || ingredients.length === 0) {
        return { calories: 0, protein_g: 0, sodium_mg: 0, carbohydrates_g: 0 };
    }

    let estimatedCalories = 0;
    let estimatedProtein = 0;
    let estimatedSodium = 0;
    let estimatedCarbs = 0;

    ingredients.forEach(ingredient => {
        const text = (typeof ingredient === 'string' ? ingredient : ingredient.text || ingredient.name || '').toLowerCase();

        // Basic estimation patterns for common ingredients
        if (text.includes('rice') || text.includes('pasta') || text.includes('noodle')) {
            estimatedCalories += 200; estimatedCarbs += 45; estimatedSodium += 5;
        } else if (text.includes('chicken') || text.includes('beef') || text.includes('pork')) {
            estimatedCalories += 250; estimatedProtein += 25; estimatedSodium += 50;
        } else if (text.includes('fish') || text.includes('salmon') || text.includes('tuna')) {
            estimatedCalories += 200; estimatedProtein += 22; estimatedSodium += 60;
        } else if (text.includes('egg')) {
            estimatedCalories += 70; estimatedProtein += 6; estimatedSodium += 60;
        } else if (text.includes('cheese')) {
            estimatedCalories += 100; estimatedProtein += 7; estimatedSodium += 180;
        } else if (text.includes('oil') || text.includes('butter')) {
            estimatedCalories += 120; estimatedSodium += 1;
        } else if (text.includes('vegetable') || text.includes('carrot') || text.includes('onion') || text.includes('tomato')) {
            estimatedCalories += 25; estimatedCarbs += 5; estimatedSodium += 5;
        } else {
            // Generic ingredient
            estimatedCalories += 50; estimatedProtein += 2; estimatedCarbs += 8; estimatedSodium += 10;
        }
    });

    return {
        calories: Math.round(estimatedCalories),
        protein_g: Math.round(estimatedProtein),
        sodium_mg: Math.round(estimatedSodium),
        carbohydrates_g: Math.round(estimatedCarbs)
    };
}

// Infer simple label from ingredient text
function inferLabelFromText(text) {
    if (!text) return null;
    const s = String(text).toLowerCase();
    if (/\b(canned|tin|in brine|in oil|drained)\b/.test(s)) return 'canned';
    if (/\b(frozen|flash frozen)\b/.test(s)) return 'frozen';
    if (/\b(dried|dehydrated|dry|raisins|dried apricot|sun-dried)\b/.test(s)) return 'dry';
    if (/\b(cooked|boiled|steamed|roasted|grilled|baked|stir[- ]fry|saute|pan fried)\b/.test(s)) return 'cooked';
    if (/\b(raw|fresh)\b/.test(s)) return 'raw';
    if (/\b(unsweetened|no sugar|no added sugar)\b/.test(s)) return 'unsweetened';
    if (/\b(sweetened|sugared|with sugar|honey|syrup|sweet)\b/.test(s)) return 'sweetened';
    if (/\b(enriched|fortified)\b/.test(s)) return 'enriched';
    if (/\b(caffeine|coffee|caffeinated)\b/.test(s)) return 'caffeine';
    return null;
}

// Helper: return first non-null value for a list of possible keys
function getAny(obj, keys) {
    if (!obj || !Array.isArray(keys)) return null;
    for (const k of keys) {
        if (obj[k] != null) return obj[k];
    }
    return null;
}

// Return nutrition values with sanity checks and validation
function adjustNutritionValue(value, label) {
    if (value == null) return null;

    // Apply sanity checks for unrealistic values
    let adjusted = value;

    // Sodium sanity checks (per serving should rarely exceed these limits)
    if (label === 'Sodium' && adjusted > 2000) {
        console.warn(`Abnormal sodium value detected: ${adjusted}mg, reducing to reasonable amount`);
        // Assume it's a parsing error and reduce to reasonable range
        if (adjusted > 10000) adjusted = adjusted / 100; // Likely 100g default error
        else if (adjusted > 5000) adjusted = adjusted / 10; // Likely 10x error
        else adjusted = Math.min(adjusted, 1500); // Cap at high but reasonable amount
    }

    // Calories sanity checks (per serving rarely exceeds 1500-2000 for normal recipes)
    if (label === 'Calories' && adjusted > 2000) {
        console.warn(`Abnormal calorie value detected: ${adjusted}kcal, checking if reasonable`);
        if (adjusted > 5000) adjusted = adjusted / 10; // Likely parsing error
    }

    // Protein sanity checks (per serving rarely exceeds 100g)
    if (label === 'Protein' && adjusted > 100) {
        console.warn(`Abnormal protein value detected: ${adjusted}g, checking if reasonable`);
        if (adjusted > 200) adjusted = adjusted / 10; // Likely parsing error
    }

    return adjusted;
}

function formatNutritionValue(raw, label) {
    const adjusted = adjustNutritionValue(raw, label);
    if (adjusted == null) return '-';

    // Add indicator if value was adjusted for data quality
    const wasAdjusted = raw != null && Math.abs(raw - adjusted) > 0.1;
    const prefix = wasAdjusted ? '~' : ''; // ~ indicates estimated/corrected value

    return prefix + fmt(adjusted);
}

// Formatter: show numeric value with two decimals, or '-' when missing
function fmt(v, digits = 2) {
    if (v == null || v === '') return '-';
    const n = Number(v);
    if (Number.isNaN(n)) return '-';
    return n.toFixed(digits);
}

function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

async function renderNutritionDashboard() {
    const resultsDiv = document.getElementById('nutrition-results');
    if (!resultsDiv) return;
    // resultsDiv.innerHTML = '<div style="text-align:center;color:#888;">Loading nutrition...</div>';
    let ingredients = null;
    try {
        const recipeId = getQueryParam('id');
        if (recipeId) {
            // Step 1: fetch recipe by id
            const url = `${API_CONFIG.RECIPES_API}?recipe_id=${encodeURIComponent(recipeId)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Recipe not found');
            const data = await res.json();
            const recipe = (data.items && data.items[0]) || null;
            if (!recipe || !recipe.ingredients) throw new Error('No ingredients found for this recipe');
            ingredients = recipe.ingredients;
            // Step 2: fetch nutrition summary
            const nutri = await fetchNutrition(ingredients);
            const sum = nutri.summary_100g_sum || {};

            // Get servings for per-serving calculation
            const servings = recipe.servings || recipe.yield || 4; // Default to 4 servings

            const fields = [
                { keys: ['calories'], label: 'Calories', icon: 'fa-fire', unit: 'kcal', daily_male: 2200, daily_female: 1800 },
                { keys: ['protein'], label: 'Protein', icon: 'fa-drumstick-bite', unit: 'g', daily_male: 56, daily_female: 46 },
                { keys: ['total_fat'], label: 'Total Fat', icon: 'fa-bacon', unit: 'g', daily_male: 73, daily_female: 60 },
                { keys: ['carbohydrates'], label: 'Carbs', icon: 'fa-bread-slice', unit: 'g', daily_male: 130, daily_female: 130 },
                { keys: ['dietary_fiber'], label: 'Fiber', icon: 'fa-seedling', unit: 'g', daily_male: 28, daily_female: 22.4 },
                { keys: ['total_sugars'], label: 'Sugars', icon: 'fa-cube', unit: 'g', daily_male: null, daily_female: null },
                { keys: ['saturated_fats'], label: 'Saturated Fat', icon: 'fa-cheese', unit: 'g', daily_male: 24, daily_female: 20 },
                { keys: ['trans_fats'], label: 'Trans Fat', icon: 'fa-ban', unit: 'g', daily_male: 0, daily_female: 0 },
                { keys: ['vitamin_d'], label: 'Vitamin D', icon: 'fa-sun', unit: 'IU', daily_male: 600, daily_female: 600 },
                { keys: ['calcium'], label: 'Calcium', icon: 'fa-bone', unit: 'mg', daily_male: 1200, daily_female: 1200 },
                { keys: ['iron'], label: 'Iron', icon: 'fa-magnet', unit: 'mg', daily_male: 8, daily_female: 8 },
                { keys: ['potassium'], label: 'Potassium', icon: 'fa-bolt', unit: 'mg', daily_male: 4700, daily_female: 4700 },
            ];
            resultsDiv.innerHTML = '<div class="nutrition-cards"></div>';
            const cards = resultsDiv.querySelector('.nutrition-cards');
            fields.forEach(f => {
                const raw = getAny(sum, f.keys);
                // Divide by servings to get per-serving nutrition values
                const perServingValue = raw != null ? raw / servings : null;
                const val = perServingValue != null ? fmt(perServingValue) : '-';
                const card = document.createElement('div');
                card.className = 'nutrition-card';
                card.innerHTML = `
                    <div class="nutrition-icon"><i class="fas ${f.icon}"></i></div>
                    <div class="nutrition-label">${f.label}</div>
                    <div class="nutrition-value">${val}${f.unit ? ' ' + f.unit : ''}</div>
                `;
                cards.appendChild(card);
            });
        } else {
            // No ?id=, show dashboard nutrition
            // resultsDiv.innerHTML = '<div style="color:#888;text-align:center;">No recipe selected. Showing dashboard summary below.</div>';
            renderDashboardNutrition();
            return;
        }
    } catch (e) {
        resultsDiv.innerHTML = `<div style="color:#c00;text-align:center;">${e.message}</div>`;
    }
}

// Auto-execute on page load
if (window.location.pathname.includes('nutrition-dashboard')) {
    document.addEventListener('DOMContentLoaded', () => {
        renderMealsAddedList();
        if (typeof renderDashboardNutrition === 'function') {
            renderDashboardNutrition();
        }
    });
}

async function fetchRecipes({ keyword, category, habit, diet_type, allergy_filter, limit = 10, nextToken = null }, retryCount = 0) {
    const maxRetries = 2;
    const params = new URLSearchParams();
    if (keyword) params.append('title_prefix', keyword);
    if (category && category !== 'all') params.append('category', category);
    if (habit && habit !== 'all') params.append('habit', habit);
    if (diet_type && diet_type !== 'all') params.append('diet_type', diet_type);
    if (allergy_filter && allergy_filter !== 'all') params.append('allergy_filter', allergy_filter);
    if (limit) params.append('limit', limit);
    if (nextToken) params.append('next_token', nextToken);
    const url = `${API_CONFIG.RECIPES_API}?${params.toString()}`;
    // Progressive timeout: longer timeout for retries
    const timeoutMs = 15000 + (retryCount * 5000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
        res = await fetch(url, { signal: controller.signal });
    } catch (e) {
        clearTimeout(timeout);
        if (e.name === 'AbortError') {
            if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Progressive delay
                return fetchRecipes({ keyword, category, habit, diet_type, allergy_filter, limit, nextToken }, retryCount + 1);
            }
            throw new Error('Search timeout after retries, please try again.');
        }
        throw e;
    } finally {
        clearTimeout(timeout);
    }
    if (!res.ok) {
        // Retry on 500 errors (server issues)
        if (res.status >= 500 && retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Progressive delay
            return fetchRecipes({ keyword, category, habit, diet_type, allergy_filter, limit, nextToken }, retryCount + 1);
        }

        const txt = await res.text().catch(() => res.statusText || '');
        const message = `Recipes API ${res.status} ${res.statusText} ${txt ? '- ' + txt.slice(0, 120) : ''}`;
        const err = new Error(message);
        err.status = res.status;
        throw err;
    }
    const data = await res.json();
    // Fuzzy matching (tolerate typos) on frontend
    if (keyword && data.items) {
        const fuse = getFuseInstance(data.items);
        let fuzzyResults = fuse.search(keyword, 3); // allow up to 3 typos
        if (fuzzyResults.length === 0) {
            // fallback: partial match (includes)
            const kw = keyword.toLowerCase();
            fuzzyResults = data.items.map(item => {
                let fields = [];
                if (item.title) fields.push(item.title);
                if (Array.isArray(item.ingredients)) fields = fields.concat(item.ingredients);
                for (const field of fields) {
                    if (String(field).toLowerCase().includes(kw)) return { item, score: 0 };
                }
                return null;
            }).filter(Boolean);
        }
        data.items = fuzzyResults.map(r => r.item);
    }
    return data;
    // Simple fuzzy matching tool (Levenshtein distance)
    function getFuseInstance(items) {
        // Only load Fuse.js implementation on first call
        if (!window.Fuse) {
            class Fuse {
                constructor(list) { this.list = list; }
                search(pattern, maxTypos = 3) {
                    pattern = pattern.toLowerCase();
                    return this.list.map(item => {
                        let minDist = 99;
                        let fields = [];
                        if (item.title) fields.push(item.title);
                        if (Array.isArray(item.ingredients)) fields = fields.concat(item.ingredients);
                        for (const field of fields) {
                            const dist = levenshtein(pattern, String(field).toLowerCase());
                            if (dist < minDist) minDist = dist;
                            if (String(field).toLowerCase().includes(pattern)) minDist = 0;
                        }
                        return { item, score: minDist };
                    }).filter(r => r.score <= maxTypos)
                        .sort((a, b) => a.score - b.score);
                }
            }
            function levenshtein(a, b) {
                const matrix = [];
                for (let i = 0; i <= b.length; i++) matrix[i] = [i];
                for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
                for (let i = 1; i <= b.length; i++) {
                    for (let j = 1; j <= a.length; j++) {
                        if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
                        else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j] + 1, matrix[i - 1][j] + 1);
                    }
                }
                return matrix[b.length][a.length];
            }
            window.Fuse = Fuse;
        }
        return new window.Fuse(items);
    }
}


document.addEventListener('DOMContentLoaded', function () {
    // Mobile menu functionality
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function (e) {
            e.preventDefault();
            navLinks.classList.toggle('show');

            // Update aria-expanded for accessibility
            const isExpanded = navLinks.classList.contains('show');
            mobileMenuBtn.setAttribute('aria-expanded', isExpanded);

            // Change icon
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                if (isExpanded) {
                    icon.className = 'fas fa-times';
                } else {
                    icon.className = 'fas fa-bars';
                }
            }
        });

        // Close mobile menu when clicking on a nav link
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('show');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                const icon = mobileMenuBtn.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', function (e) {
            if (!mobileMenuBtn.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('show');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                const icon = mobileMenuBtn.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
            }
        });
    }

    // Features section routing
    const mealPlanning = document.getElementById('feature-meal-planning');
    const shoppingList = document.getElementById('feature-shopping-list');
    const recommendations = document.getElementById('feature-recommendations');
    if (mealPlanning) mealPlanning.addEventListener('click', function (e) { e.preventDefault(); window.location.href = 'meal-planning.html'; });
    if (shoppingList) shoppingList.addEventListener('click', function (e) { e.preventDefault(); window.location.href = 'shopping-list.html'; });
    if (recommendations) recommendations.addEventListener('click', function (e) { e.preventDefault(); window.location.href = 'daily-recommendations.html'; });
    // Modal logic
    const modal = document.getElementById('recipe-modal');
    const modalBackdrop = modal ? modal.querySelector('.modal-backdrop') : null;
    const modalCard = modal ? modal.querySelector('.modal-card') : null;
    const modalCloseBtn = modal ? modal.querySelector('.modal-close') : null;
    const modalTitle = modal ? modal.querySelector('.modal-title') : null;
    const modalDesc = modal ? modal.querySelector('.modal-description') : null;
    const modalIngredients = modal ? modal.querySelector('.modal-ingredients') : null;
    const modalInstructions = modal ? modal.querySelector('.modal-instructions') : null;
    const modalNutrition = modal ? modal.querySelector('.modal-nutrition') : null;
    const modalDashboardBtn = modal ? modal.querySelector('#add-to-dashboard') : null;

    function openModal(recipe) {
        if (!modal) return;
        if (modalTitle) modalTitle.textContent = recipe.title || '';
        if (modalDesc) modalDesc.textContent = recipe.description || '';
        // Ingredients
        if (modalIngredients) {
            modalIngredients.innerHTML = '';
            (recipe.ingredients || []).forEach(ing => {
                const li = document.createElement('li');
                li.textContent = ing;
                modalIngredients.appendChild(li);
            });
        }
        // Instructions
        if (modalInstructions) {
            modalInstructions.innerHTML = '';
            (recipe.instructions || []).forEach(ins => {
                const li = document.createElement('li');
                li.textContent = ins;
                modalInstructions.appendChild(li);
            });
        }
        // Nutrition
        if (modalNutrition) {
            fetchNutrition(recipe.ingredients).then(nutri => {
                const sum = nutri.summary_100g_sum || {};
                if (Object.keys(sum).length === 0) {
                    modalNutrition.innerHTML = '<div style="color:#888;text-align:center;">No nutrition matches found for listed ingredients.</div>';
                    return;
                }

                // Get servings for per-serving calculation
                const servings = recipe.servings || recipe.yield || 4; // Default to 4 servings

                const fields = [
                    { keys: ['calories'], label: 'Calories', icon: 'fa-fire', unit: 'kcal' },
                    { keys: ['protein'], label: 'Protein', icon: 'fa-drumstick-bite', unit: 'g' },
                    { keys: ['total_fat'], label: 'Total Fat', icon: 'fa-bacon', unit: 'g' },
                    { keys: ['carbohydrates'], label: 'Carbs', icon: 'fa-bread-slice', unit: 'g' },
                    { keys: ['dietary_fiber'], label: 'Fiber', icon: 'fa-seedling', unit: 'g' },
                    { keys: ['total_sugars'], label: 'Sugars', icon: 'fa-cube', unit: 'g' },
                    { keys: ['saturated_fats'], label: 'Saturated Fat', icon: 'fa-cheese', unit: 'g' },
                    { keys: ['trans_fats'], label: 'Trans Fat', icon: 'fa-ban', unit: 'g' },
                    { keys: ['vitamin_d'], label: 'Vitamin D', icon: 'fa-sun', unit: 'IU' },
                    { keys: ['calcium'], label: 'Calcium', icon: 'fa-bone', unit: 'mg' },
                    { keys: ['iron'], label: 'Iron', icon: 'fa-magnet', unit: 'mg' },
                    { keys: ['potassium'], label: 'Potassium', icon: 'fa-bolt', unit: 'mg' },
                ];
                let html = '<div class="nutrition-cards">';
                fields.forEach(f => {
                    const raw = getAny(sum, f.keys);
                    // Divide by servings to get per-serving nutrition values
                    const perServingValue = raw != null ? raw / servings : null;
                    const val = perServingValue != null ? fmt(perServingValue) : '-';
                    html += `<div class="nutrition-card">
                            <div class="nutrition-icon"><i class="fas ${f.icon}"></i></div>
                            <div class="nutrition-label">${f.label}</div>
                            <div class="nutrition-value">${val}${f.unit ? ' ' + f.unit : ''}</div>
                        </div>`;
                });
                html += '</div>';
                modalNutrition.innerHTML = html;
            }).catch(e => {
                modalNutrition.innerHTML = `<div style="color:#c00;text-align:center;">${e.message}</div>`;
            });
        }
        // Dashboard button
        if (modalDashboardBtn) {
            modalDashboardBtn.onclick = function () {
                let dashboard = [];
                try { dashboard = JSON.parse(localStorage.getItem(DASHBOARD_KEY)) || []; } catch { }
                if (!dashboard.some(r => r.recipe_id === recipe.recipe_id)) {
                    dashboard.push(recipe);
                    localStorage.setItem(DASHBOARD_KEY, JSON.stringify(dashboard));
                    modalDashboardBtn.textContent = 'Added!';
                    modalDashboardBtn.disabled = true;
                } else {
                    modalDashboardBtn.textContent = 'Already in Dashboard';
                    modalDashboardBtn.disabled = true;
                }
            };
        }

        // View Dashboard button
        const viewDashboardBtn = modal ? modal.querySelector('#view-dashboard') : null;
        if (viewDashboardBtn) {
            viewDashboardBtn.onclick = function () {
                window.location.href = 'nutrition-dashboard.html';
            };
        }
        // Show modal
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        // Reset button state
        if (modalDashboardBtn) {
            modalDashboardBtn.textContent = 'Add to Nutrition Dashboard';
            modalDashboardBtn.disabled = false;
        }
    }

    if (modalCloseBtn) modalCloseBtn.onclick = closeModal;
    if (modalBackdrop) modalBackdrop.onclick = closeModal;
    const searchInput = document.querySelector('.search-input');
    const recipeCategorySelect = document.getElementById('recipe-category');
    const dietTypeSelect = document.getElementById('diet-type');
    const allergyFilterSelect = document.getElementById('allergy-filter');
    const sortBySelect = document.getElementById('sort-by');
    const applyFiltersBtn = document.querySelector('.apply-filters-btn');
    const resultsHeader = document.querySelector('.results-header h2');
    const cardsContainer = document.querySelector('.recipe-cards-container');

    // Delegate click to recipe cards
    if (cardsContainer) {
        cardsContainer.addEventListener('click', async (e) => {
            const card = e.target.closest('.recipe-card');
            if (!card) return;
            const id = card.dataset.id;
            let recipe = card._recipe;

            if (!recipe || !Array.isArray(recipe.ingredients) || !Array.isArray(recipe.directions)) {
                // Fetch details if missing
                const res = await fetch(`${API_CONFIG.RECIPES_API}?recipe_id=${encodeURIComponent(id)}`);
                if (!res.ok) return alert('Failed to load recipe details');
                const data = await res.json();
                recipe = (data.items && data.items[0]) || {};
            }
            openRecipeModal(recipe);
        });
    }
    const modalContainer = document.getElementById('recipe-modal-container');
    const dashboardKey = 'nutrition_dashboard_recipes';

    // Modal logic for recipe details
    function showRecipeModal(recipe) {
        if (!modalContainer) return;
        modalContainer.innerHTML = '';
        const modal = document.createElement('div');
        modal.className = 'modal recipe-modal-upgraded';
        modal.tabIndex = -1;
        // Use recipe.image or placeholder
        const imgSrc = recipe.image || recipe.img || 'https://via.placeholder.com/400x200?text=No+Image';
        // Tags
        const habits = (recipe.habits || []).map(h => `<span class="tag habit">${h}</span>`).join(' ');
        const categories = (recipe.categories || []).map(c => `<span class="tag category">${c}</span>`).join(' ');
        // Favorite button state
        let dashboard = [];
        try { dashboard = JSON.parse(localStorage.getItem(dashboardKey)) || []; } catch { }
        const isFav = dashboard.some(r => r.recipe_id === recipe.recipe_id);
        // Create ingredients list HTML
        const ingredientsList = (recipe.ingredients || []).map(ingredient =>
            `<li>${ingredient}</li>`
        ).join('');

        // Create instructions list HTML
        const instructionsText = recipe.instructions || '';
        let instructionsList = '';
        if (instructionsText) {
            // Split instructions by sentences and create numbered steps
            const steps = instructionsText.split(/[.!?]+/).filter(step => step.trim().length > 10);
            instructionsList = steps.map(step =>
                `<li>${step.trim()}.</li>`
            ).join('');
        }

        modal.innerHTML = `
            <div class="modal-content upgraded-modal-content">
                <button class="close" tabindex="0" aria-label="Close"><i class="fas fa-times"></i></button>
                <div class="modal-img-row">
                    <img src="${imgSrc}" alt="${recipe.title || 'Recipe'}" class="modal-recipe-img" />
                </div>
                <div class="modal-header-row">
                    <h2 class="modal-title">${recipe.title || ''}</h2>
                    <button class="favorite-btn" title="Add to Dashboard">
                        <i class="fa${isFav ? 's' : 'r'} fa-heart"></i>
                    </button>
                </div>
                <div class="modal-tags-row">
                    ${habits} ${categories}
                </div>
                
                <div class="modal-two-columns">
                    <div class="modal-column">
                        <h4><i class="fas fa-list"></i> Ingredients</h4>
                        <ul class="modal-ingredients-list">
                            ${ingredientsList || '<li>No ingredients available</li>'}
                        </ul>
                    </div>
                    <div class="modal-column">
                        <h4><i class="fas fa-clipboard-list"></i> Instructions</h4>
                        <ul class="modal-instructions-list">
                            ${instructionsList || '<li>No instructions available</li>'}
                        </ul>
                    </div>
                </div>
                
                <div class="modal-section modal-nutrition-row">
                    <button class="btn btn-primary nutrition-match-btn">Show Nutrition</button>
                    <div class="nutrition-modal-results" style="margin-top:1rem;"></div>
                </div>
            </div>
        `;
        modalContainer.appendChild(modal);
        modalContainer.style.display = 'block';

        // Close modal logic
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = closeModal;
        closeBtn.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') closeModal(); };
        function closeModal() {
            modalContainer.style.display = 'none';
            modalContainer.innerHTML = '';
        }

        // Nutrition match button
        const nutritionBtn = modal.querySelector('.nutrition-match-btn');
        const nutritionResults = modal.querySelector('.nutrition-modal-results');
        nutritionBtn.onclick = async function () {
            nutritionBtn.disabled = true;
            // nutritionResults.innerHTML = '<div style="text-align:center;color:#888;">Loading nutrition...</div>';
            try {
                const nutri = await fetchNutrition(recipe.ingredients);
                const sum = nutri.summary_100g_sum || {};
                if (Object.keys(sum).length === 0) {
                    nutritionResults.innerHTML = '<div style="color:#888;text-align:center;">No nutrition matches found for listed ingredients.</div>';
                    return;
                }

                // DEBUG: Log modal nutrition data
                // Modal Nutrition Debug for ${recipe.title}

                // Get servings for per-serving calculation
                const servings = recipe.servings || recipe.yield || 4; // Default to 4 servings
                const fields = [
                    { keys: ['calories'], label: 'Calories', icon: 'fa-fire', unit: 'kcal' },
                    { keys: ['protein'], label: 'Protein', icon: 'fa-drumstick-bite', unit: 'g' },
                    { keys: ['total_fat'], label: 'Total Fat', icon: 'fa-bacon', unit: 'g' },
                    { keys: ['carbohydrates'], label: 'Carbs', icon: 'fa-bread-slice', unit: 'g' },
                    { keys: ['dietary_fiber'], label: 'Fiber', icon: 'fa-seedling', unit: 'g' },
                    { keys: ['total_sugars'], label: 'Sugars', icon: 'fa-cube', unit: 'g' },
                    { keys: ['saturated_fats'], label: 'Saturated Fat', icon: 'fa-cheese', unit: 'g' },
                    { keys: ['trans_fats'], label: 'Trans Fat', icon: 'fa-ban', unit: 'g' },
                    { keys: ['vitamin_d'], label: 'Vitamin D', icon: 'fa-sun', unit: 'IU' },
                    { keys: ['calcium'], label: 'Calcium', icon: 'fa-bone', unit: 'mg' },
                    { keys: ['iron'], label: 'Iron', icon: 'fa-magnet', unit: 'mg' },
                    { keys: ['potassium'], label: 'Potassium', icon: 'fa-bolt', unit: 'mg' },
                ];
                nutritionResults.innerHTML = '<div class="nutrition-cards"></div>';
                const cards = nutritionResults.querySelector('.nutrition-cards');
                fields.forEach(f => {
                    const raw = getAny(sum, f.keys);
                    // Use backend-processed data directly (no frontend adjustments needed)
                    const perServingValue = Math.round((raw || 0) / servings);
                    const val = formatNutritionNumber(perServingValue, f.unit || '');

                    const card = document.createElement('div');
                    card.className = 'nutrition-card';
                    card.innerHTML = `
                            <div class="nutrition-icon"><i class="fas ${f.icon}"></i></div>
                            <div class="nutrition-label">${f.label} (per serving)</div>
                            <div class="nutrition-value">${val}</div>
                        `;
                    cards.appendChild(card);
                });
            } catch (e) {
                nutritionResults.innerHTML = `<div style="color:#c00;text-align:center;">${e.message}</div>`;
            } finally {
                nutritionBtn.disabled = false;
            }
        };

        // Favorite (dashboard) button logic
        const favBtn = modal.querySelector('.favorite-btn');
        favBtn.onclick = function () {
            let dashboard = [];
            try { dashboard = JSON.parse(localStorage.getItem(dashboardKey)) || []; } catch { }
            const idx = dashboard.findIndex(r => r.recipe_id === recipe.recipe_id);
            if (idx === -1) {
                dashboard.push({ recipe_id: recipe.recipe_id, title: recipe.title, ingredients: recipe.ingredients });
                localStorage.setItem(dashboardKey, JSON.stringify(dashboard));
                favBtn.innerHTML = '<i class="fas fa-heart"></i>';
            } else {
                dashboard.splice(idx, 1);
                localStorage.setItem(dashboardKey, JSON.stringify(dashboard));
                favBtn.innerHTML = '<i class="far fa-heart"></i>';
            }
        };
        // Trap focus inside modal for accessibility
        modal.focus();
    }
    let nextToken = null;
    let lastQuery = {};
    let displayedRecipeIds = new Set(); // Track displayed recipes to avoid duplicates

    // Seasonal data cache (preloaded for performance)
    let seasonalData = null;
    let currentSeason = '';

    // Preload seasonal data on page load
    async function loadSeasonalData() {
        try {
            const response = await fetch('season_food.json');
            seasonalData = await response.json();

            // Detect current season based on month (Southern Hemisphere - Australia)
            const month = new Date().getMonth() + 1;
            if ([12, 1, 2].includes(month)) currentSeason = 'summer';
            else if ([3, 4, 5].includes(month)) currentSeason = 'autumn';
            else if ([6, 7, 8].includes(month)) currentSeason = 'winter';
            else if ([9, 10, 11].includes(month)) currentSeason = 'spring';

            // Update hint text
            const seasonHint = document.getElementById('current-season-hint');
            if (seasonHint) {
                const seasonEmoji = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };
                seasonHint.textContent = `(Fresh ingredients in season now - ${seasonEmoji[currentSeason]} ${currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1)})`;
            }
        } catch (error) {
            console.error('Failed to load seasonal data:', error);
        }
    }

    // Check if recipe contains seasonal ingredients
    function isSeasonalRecipe(recipe) {
        if (!seasonalData || !currentSeason || !recipe.ingredients) return false;

        const ingredients = recipe.ingredients.map(ing =>
            (typeof ing === 'string' ? ing : ing.ingredient || '').toLowerCase()
        );

        // Check all states for seasonal ingredients (more permissive)
        for (const state of Object.values(seasonalData)) {
            const allSeasonalItems = { ...state.fruits, ...state.vegetables };

            for (const [itemName, seasons] of Object.entries(allSeasonalItems)) {
                if (seasons.includes(currentSeason)) {
                    // Check if this seasonal item appears in recipe ingredients
                    if (ingredients.some(ing => ing.includes(itemName.toLowerCase()))) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Sort recipes by nutrition values
    async function sortRecipesByNutrition(recipes, sortBy) {
        if (sortBy === 'default' || !recipes.length) return recipes;

        // Fetch nutrition data for all recipes
        const recipesWithNutrition = await Promise.all(
            recipes.map(async (recipe) => {
                try {
                    const nutrition = await fetchNutrition(recipe.ingredients || []);
                    const sum = nutrition.summary_100g_sum || {};

                    // DEBUG: Log nutrition data for debugging
                    // Nutrition Debug for ${recipe.title}

                    // NOTE: According to backend analysis, summary_100g_sum contains TOTAL recipe nutrition
                    // not per-100g values. The field name is misleading.
                    // We should divide by servings to get per-serving nutrition
                    const servings = recipe.servings || recipe.yield || 4; // Default to 4 servings if not specified

                    return {
                        ...recipe,
                        nutritionData: {
                            calories: Math.round((getAny(sum, ['calories']) || 0) / servings),
                            protein: Math.round((getAny(sum, ['protein']) || 0) / servings),
                            calcium: Math.round((getAny(sum, ['calcium']) || 0) / servings),
                            vitamin_d: Math.round((getAny(sum, ['vitamin_d']) || 0) / servings)
                        }
                    };
                } catch (error) {
                    return {
                        ...recipe,
                        nutritionData: { calories: 0, protein: 0, calcium: 0, vitamin_d: 0 }
                    };
                }
            })
        );

        // Sort based on the selected option
        const sorted = recipesWithNutrition.sort((a, b) => {
            const aNutrition = a.nutritionData;
            const bNutrition = b.nutritionData;

            switch (sortBy) {
                case 'calories-high':
                    return bNutrition.calories - aNutrition.calories;
                case 'calories-low':
                    return aNutrition.calories - bNutrition.calories;
                case 'protein-high':
                    return bNutrition.protein - aNutrition.protein;
                case 'protein-low':
                    return aNutrition.protein - bNutrition.protein;
                case 'calcium-high':
                    return bNutrition.calcium - aNutrition.calcium;
                case 'calcium-low':
                    return aNutrition.calcium - bNutrition.calcium;
                case 'vitamin_d-high':
                    return bNutrition.vitamin_d - aNutrition.vitamin_d;
                case 'vitamin_d-low':
                    return aNutrition.vitamin_d - bNutrition.vitamin_d;
                default:
                    return 0;
            }
        });

        return sorted;
    }

    // Helper function to create loading animation HTML
    function createLoadingHTML(message, subtext = '') {
        return `
            <div class="recipe-loading-container">
                <div class="recipe-loading-spinner"></div>
                <div class="recipe-loading-text">${message}</div>
                ${subtext ? `<div class="recipe-loading-subtext">${subtext}</div>` : ''}
            </div>
        `;
    }

    async function updateRecipes(reset = true) {
        const keyword = searchInput ? searchInput.value.trim() : '';
        const category = recipeCategorySelect ? recipeCategorySelect.value : '';
        const diet_type = dietTypeSelect ? dietTypeSelect.value : '';
        const allergy_filter = allergyFilterSelect ? allergyFilterSelect.value : '';
        const sortBy = sortBySelect ? sortBySelect.value : 'default';
        const seasonalFilter = document.getElementById('seasonal-filter')?.checked || false;

        if (reset) {
            nextToken = null;
            lastQuery = { keyword, category, diet_type, allergy_filter, sortBy, seasonalFilter };
            displayedRecipeIds.clear(); // Clear displayed recipes on new search
        }
        if (cardsContainer && reset) cardsContainer.innerHTML = createLoadingHTML('Loading Recipes', 'Finding the best recipes for you');
        try {
            const { items = [], next_token } = await fetchRecipes({ keyword, category, diet_type, allergy_filter, nextToken: reset ? null : nextToken });
            let filteredItems = items;

            // Remove duplicates and already displayed recipes
            const originalCount = filteredItems.length;
            filteredItems = filteredItems.filter(r => {
                if (displayedRecipeIds.has(r.recipe_id)) {
                    return false; // Skip already displayed recipes
                }
                return true;
            });
            const duplicatesFiltered = originalCount - filteredItems.length;
            if (duplicatesFiltered > 0) {
            }

            // Strict category match: only show recipes whose categories exactly match the selected category
            if (category && category !== 'all') {
                filteredItems = filteredItems.filter(r => Array.isArray(r.categories) && r.categories.includes(category));
            }

            // Apply seasonal filter (client-side, no API call)
            if (seasonalFilter && seasonalData) {
                filteredItems = filteredItems.filter(r => isSeasonalRecipe(r));
            }

            // Apply sorting by nutrition values or default quality sorting
            if (sortBy !== 'default') {
                if (cardsContainer && reset) cardsContainer.innerHTML = createLoadingHTML('Analyzing Nutrition', 'Calculating nutritional values for each recipe');
                filteredItems = await sortRecipesByNutrition(filteredItems, sortBy);
            } else {
                // For default sorting, prioritize recipes with better nutrition data quality
                if (cardsContainer && reset) cardsContainer.innerHTML = createLoadingHTML('Analyzing Recipes', 'Sorting by quality and nutritional value');
                filteredItems = sortRecipesByNutritionQuality(filteredItems);
            }
            if (cardsContainer) {
                if (reset) cardsContainer.innerHTML = '';
                if (filteredItems.length === 0 && reset) {
                    cardsContainer.innerHTML = '<div style="text-align:center;color:#888;">No related recipes provided</div>';
                } else {
                    filteredItems.forEach(r => {
                        // Add to displayed recipes set
                        displayedRecipeIds.add(r.recipe_id);

                        const card = document.createElement('div');
                        // Use different card class based on whether nutrition data is present
                        card.className = r.nutritionData ? 'recipe-card recipe-card-with-nutrition' : 'recipe-card';
                        card.tabIndex = 0;
                        card.style.cursor = 'pointer';
                        card.setAttribute('data-id', r.recipe_id || r.id || '');
                        card._recipe = r;
                        // Group tags into 3 types
                        const habits = r.habits || [];
                        const dietTags = habits.filter(h => ['vegetarian', 'vegan', 'keto', 'kosher', 'raw', 'low_sugar', 'low_sodium', 'healthyish'].includes(h))
                            .map(h => `<span class="tag diet-tag">${h}</span>`).join('');
                        const allergyTags = habits.filter(h => ['dairy_free', 'gluten_free', 'nut_free', 'shellfish_free', 'egg_free', 'soy_free', 'fish_free'].includes(h))
                            .map(h => `<span class="tag allergy-tag">${h}</span>`).join('');
                        const categoryTags = (r.categories || []).map(c => `<span class="tag category-tag">${c}</span>`).join('');

                        // Add nutrition info if available from sorting
                        let nutritionInfo = '';
                        if (r.nutritionData) {
                            // From sorting functionality - show 4 senior-friendly nutrients
                            const data = r.nutritionData;
                            nutritionInfo = `<div class="recipe-nutrition-info">
                                <span class="nutrition-item">🔥 ${formatNutritionNumber(data.calories)} kcal</span>
                                <span class="nutrition-item">💪 ${formatNutritionNumber(data.protein, 'g')} protein</span>
                                <span class="nutrition-item">🦴 ${formatNutritionNumber(data.calcium, 'mg')} calcium</span>
                                <span class="nutrition-item">☀️ ${formatNutritionNumber(data.vitamin_d, 'IU')} vitamin D</span>
                            </div>`;
                        }

                        // Add image if available
                        const imageHtml = r.has_image && r.image_display ?
                            `<div class="recipe-image"><img src="${r.image_display}" alt="${r.title}" onerror="this.parentElement.innerHTML='<i class=\\"fas fa-utensils\\" style=\\"color:#ccc;font-size:3rem;\\"></i>'"></div>` :
                            `<div class="recipe-image-placeholder"><i class="fas fa-utensils"></i></div>`;

                        // Get cooking time and difficulty info
                        const cookingTime = r.cooking_time || r.cook_time || r.total_time || r.prep_time || null;
                        const difficulty = r.difficulty || r.level || r.skill_level || null;

                        const cookingTimeHtml = cookingTime ? `<span class="recipe-info-item"><i class="fas fa-clock"></i> Time: ${cookingTime}</span>` : '';
                        const difficultyHtml = difficulty ? `<span class="recipe-info-item"><i class="fas fa-chart-bar"></i> Difficulty: ${difficulty}</span>` : '';

                        // Check if recipe is seasonal and filter is active
                        const isSeasonal = seasonalFilter && isSeasonalRecipe(r);
                        const seasonalBadge = isSeasonal ? `<div class="seasonal-badge"><i class="fas fa-leaf"></i> Seasonal</div>` : '';

                        card.innerHTML = `
                            ${seasonalBadge}
                            ${imageHtml}
                            <div class="recipe-content">
                                <div class="recipe-title">${r.title || ''}</div>
                                ${nutritionInfo}
                                <div class="recipe-info-row">
                                    ${cookingTimeHtml}
                                    ${difficultyHtml}
                                </div>
                            </div>
                        `;
                        cardsContainer.appendChild(card);
                    });
                }
            }
            nextToken = next_token || null;
            // Pagination button
            let loadMoreBtn = document.getElementById('load-more-btn');
            if (loadMoreBtn) loadMoreBtn.remove();
            if (nextToken && cardsContainer) {
                loadMoreBtn = document.createElement('button');
                loadMoreBtn.id = 'load-more-btn';
                loadMoreBtn.className = 'btn btn-primary';
                loadMoreBtn.textContent = 'Load more';
                loadMoreBtn.style.display = 'block';
                loadMoreBtn.style.margin = '1.5rem auto';
                loadMoreBtn.onclick = function () {
                    loadMoreBtn.textContent = 'Loading...';
                    loadMoreBtn.disabled = true;
                    updateRecipes(false);
                };
                cardsContainer.appendChild(loadMoreBtn);
            } else if (!nextToken && filteredItems.length > 0 && cardsContainer) {
                // Show "No more recipe available" when there is no more data
                const endDiv = document.createElement('div');
                endDiv.style.textAlign = 'center';
                endDiv.style.color = '#888';
                endDiv.style.margin = '1.5rem auto';
                endDiv.textContent = 'No more recipe available';
                cardsContainer.appendChild(endDiv);
            }
            if (resultsHeader) {
                const total = cardsContainer.querySelectorAll('.recipe-card').length;
                resultsHeader.textContent = `${total} Recipe${total !== 1 ? 's' : ''} Found`;
            }
        } catch (e) {
            // If server error 5xx try a graceful fallback (no title_prefix) once
            if (e && e.status && String(e.status).startsWith('5')) {
                try {
                    const fallback = await fetchRecipes({ keyword: '', category, diet_type, allergy_filter, limit: 10 });
                    if (fallback && fallback.items && fallback.items.length) {
                        // render fallback results by reusing logic
                        const tempItems = fallback.items;
                        if (cardsContainer) {
                            cardsContainer.innerHTML = '';
                            tempItems.forEach(r => {
                                const card = document.createElement('div');
                                card.className = 'recipe-card';
                                card.tabIndex = 0;
                                card.style.cursor = 'pointer';
                                card.setAttribute('data-id', r.recipe_id || r.id || '');
                                card._recipe = r;
                                const habits = r.habits || [];
                                const dietTags = habits.filter(h => ['vegetarian', 'vegan', 'keto', 'kosher', 'raw', 'low_sugar', 'low_sodium', 'healthyish'].includes(h))
                                    .map(h => `<span class="tag diet-tag">${h}</span>`).join('');
                                const allergyTags = habits.filter(h => ['dairy_free', 'gluten_free', 'nut_free', 'shellfish_free', 'egg_free', 'soy_free', 'fish_free'].includes(h))
                                    .map(h => `<span class="tag allergy-tag">${h}</span>`).join('');
                                const categoryTags = (r.categories || []).map(c => `<span class="tag category-tag">${c}</span>`).join('');
                                // Add image if available  
                                const imageHtml = r.has_image && r.image_display ?
                                    `<div class="recipe-image"><img src="${r.image_display}" alt="${r.title}" onerror="this.parentElement.innerHTML='<i class=\\"fas fa-utensils\\" style=\\"color:#ccc;font-size:3rem;\\"></i>'"></div>` :
                                    `<div class="recipe-image-placeholder"><i class="fas fa-utensils"></i></div>`;

                                // Get cooking time and difficulty info
                                const cookingTime = r.cooking_time || r.cook_time || r.total_time || r.prep_time || null;
                                const difficulty = r.difficulty || r.level || r.skill_level || null;

                                const cookingTimeHtml = cookingTime ? `<span class="recipe-info-item"><i class="fas fa-clock"></i> Time: ${cookingTime}</span>` : '';
                                const difficultyHtml = difficulty ? `<span class="recipe-info-item"><i class="fas fa-chart-bar"></i> Level: ${difficulty}</span>` : '';

                                card.innerHTML = `
                                        ${imageHtml}
                                        <div class="recipe-content">
                                            <div class="recipe-title">${r.title || ''}</div>
                                            <div class="recipe-info-row">
                                                ${cookingTimeHtml}
                                                ${difficultyHtml}
                                            </div>
                                        </div>
                                    `;
                                cardsContainer.appendChild(card);
                            });
                        }
                        if (resultsHeader) resultsHeader.textContent = `${cardsContainer.querySelectorAll('.recipe-card').length} Recipes Found`;
                        return; // done
                    }
                } catch (inner) {
                    // ignore fallback failure, fall through to show original error
                }
            }
            if (cardsContainer) cardsContainer.innerHTML = `<div style="color:#c00;text-align:center;">Please enter a keyword or select a filter before searching.</div>`;
            if (resultsHeader) resultsHeader.textContent = '0 Recipes Found';
        }
    }

    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function () {
            updateRecipes(true);
        });
    }
    if (searchInput) {
        searchInput.addEventListener('keyup', function (e) {
            if (e.key === 'Enter') updateRecipes(true);
        });
    }

    // Load seasonal data on page load (async, no blocking)
    if (document.getElementById('seasonal-filter')) {
        loadSeasonalData().catch(err => console.error('Failed to load seasonal data:', err));
    }

    // Optionally: fetch once on page load
    updateRecipes(true);
});

function renderMealsAddedList() {
    const ul = document.querySelector('.meals-added-list');
    const clearAllBtn = document.getElementById('clear-all-meals');
    if (!ul) return;

    const day = todayKey();
    const all = readDashboard();
    const todays = all.filter(x => x.day === day);

    ul.innerHTML = '';

    if (todays.length === 0) {
        ul.innerHTML = `<li class="meal-item"><div class="meal-left">
        <div class="meal-name" style="color:#888;">No meals added yet</div>
      </div></li>`;

        // Hide clear all button when no meals
        if (clearAllBtn) clearAllBtn.style.display = 'none';

        // Auto-refresh nutrition data to show zeros
        if (typeof renderDashboardNutrition === 'function') {
            renderDashboardNutrition();
        }
        return;
    }

    // Show clear all button when there are meals
    if (clearAllBtn) {
        clearAllBtn.style.display = 'block';
        // Bind clear all button if not already bound
        if (!clearAllBtn._bound) {
            clearAllBtn._bound = true;
            clearAllBtn.onclick = function () {
                if (confirm('Are you sure you want to clear all meals for today?')) {
                    clearAllMealsForDay(day);
                    renderMealsAddedList();
                    if (typeof renderDashboardNutrition === 'function') {
                        renderDashboardNutrition();
                    }
                }
            };
        }
    }

    // Group recipes by recipe_id and title
    const groupedRecipes = {};
    todays.forEach(item => {
        const key = `${item.recipe_id}_${item.title}`;
        if (!groupedRecipes[key]) {
            groupedRecipes[key] = {
                recipe_id: item.recipe_id,
                title: item.title,
                day: item.day,
                entries: [],
                totalCalories: 0
            };
        }
        groupedRecipes[key].entries.push(item);
        if (typeof item.calories === 'number' && !Number.isNaN(item.calories)) {
            groupedRecipes[key].totalCalories += item.calories;
        }
    });

    // Render grouped recipes
    Object.values(groupedRecipes).forEach(group => {
        const li = document.createElement('li');
        li.className = 'meal-item';
        li.dataset.recipeId = group.recipe_id;
        li.dataset.day = group.day;

        const count = group.entries.length;
        const displayTitle = count > 1 ? `${group.title} ×${count}` : group.title;
        const totalKcal = group.totalCalories > 0 ? `${group.totalCalories.toFixed(0)} kcal` : '-';

        li.innerHTML = `
      <div class="meal-left">
        <div class="meal-name">${displayTitle}</div>
        <div class="meal-meta">Added today</div>
      </div>
      <div class="meal-right">
        <div class="meal-kcal">${totalKcal}</div>
        <div class="meal-controls">
          <button class="meal-add" title="Add one more serving" data-recipe-id="${group.recipe_id}" ${count >= 3 ? 'disabled' : ''}>
            <i class="fas fa-plus"></i>
          </button>
          <button class="meal-delete" title="Remove one serving" data-count="${count}">
            <i class="fas fa-minus"></i>
          </button>
        </div>
      </div>
    `;

        // Store entries data for deletion
        li._entries = group.entries;
        ul.appendChild(li);
    });

    // Bind add/remove events
    ul.querySelectorAll('.meal-add').forEach(btn => {
        btn.onclick = function () {
            const li = btn.closest('.meal-item');
            const entries = li?._entries;
            const recipeId = btn.getAttribute('data-recipe-id');

            if (!entries || entries.length === 0 || entries.length >= 3) return;

            // Use the first entry as template to add another one
            const template = entries[0];
            addToDashboard({
                recipe_id: template.recipe_id,
                title: template.title,
                ingredients: template.ingredients || [],
                calories: template.calories,
                added_at: Date.now(),
                day: template.day
            });

            renderMealsAddedList(); // refresh list
            if (typeof renderDashboardNutrition === 'function') {
                renderDashboardNutrition(); // refresh nutrition summary
            }
        };
    });

    ul.querySelectorAll('.meal-delete').forEach(btn => {
        btn.onclick = function () {
            const li = btn.closest('.meal-item');
            const entries = li?._entries;

            if (!entries || entries.length === 0) return;

            // Remove one entry (the most recent one)
            const entryToRemove = entries[entries.length - 1];
            if (entryToRemove.dashboard_entry_id) {
                removeFromDashboardByEntryId(entryToRemove.dashboard_entry_id);
            } else {
                // Fallback for old entries
                removeFromDashboardByIdAndDay(entryToRemove.recipe_id, entryToRemove.day);
            }

            renderMealsAddedList(); // refresh list
            if (typeof renderDashboardNutrition === 'function') {
                renderDashboardNutrition(); // refresh nutrition summary
            }
        };
    });
}

// ========== Nutrition Excess Alert System ==========

// Check for nutrition excess and show appropriate alerts
function checkNutritionExcess(cardFields) {
    const excessItems = [];
    const severeExcessItems = [];

    cardFields.forEach(({ curId, goalId }) => {
        const curEl = document.getElementById(curId);
        const goalEl = document.getElementById(goalId);
        if (!curEl || !goalEl) return;

        const current = Number(String(curEl.textContent).replace(/[^0-9\.\-]/g, '')) || 0;
        const goal = Number(String(goalEl.textContent).replace(/[^0-9\.\-]/g, '')) || 1;
        const percentage = (current / goal) * 100;

        const nutritionName = getNutritionName(curId);

        if (percentage > 200) {
            // Severe excess (200%+)
            severeExcessItems.push({ name: nutritionName, percentage: Math.round(percentage), current, goal });
            addNutritionCardTip(curEl, 'severe', nutritionName, percentage);
        } else if (percentage > 130) {
            // Moderate excess (130-200%)
            excessItems.push({ name: nutritionName, percentage: Math.round(percentage), current, goal });
            addNutritionCardTip(curEl, 'warning', nutritionName, percentage);
        } else if (percentage > 100) {
            // Light excess (100-130%)
            addNutritionCardTip(curEl, 'light', nutritionName, percentage);
        } else {
            // Remove any existing tips
            removeNutritionCardTip(curEl);
        }
    });

    // Show banner alert for moderate to severe excess
    if (severeExcessItems.length > 0 || excessItems.length > 0) {
        showNutritionBanner(severeExcessItems, excessItems);
    } else {
        hideNutritionBanner();
    }
}

// Get nutrition name from element ID
function getNutritionName(elementId) {
    const names = {
        'calories-current': 'Calories',
        'protein-current': 'Protein',
        'calcium-current': 'Calcium',
        'vitamin_d-current': 'Vitamin D'
    };
    return names[elementId] || elementId.replace('-current', '');
}

// Add tip to nutrition card
function addNutritionCardTip(currentElement, severity, nutritionName, percentage) {
    const card = currentElement.closest('.nutrition-card');
    if (!card) return;

    // Remove existing tip
    removeNutritionCardTip(currentElement);

    const tipMessages = {
        'light': {
            'Calories': '💡 Goal reached! Maintain balanced eating',
            'Protein': '💡 Protein sufficient! Add more vegetables',
            'Calcium': '💡 Calcium on target! Keep up dairy/leafy greens',
            'Vitamin D': '💡 Vitamin D sufficient! Great for bone health'
        },
        'warning': {
            'Calories': '⚠️ High calories - choose lighter foods',
            'Protein': '⚠️ Excess protein - reduce meat intake',
            'Calcium': '⚠️ Calcium high - balance with other nutrients',
            'Vitamin D': '⚠️ Vitamin D high - check supplement dosage'
        },
        'severe': {
            'Calories': '🚨 Calories severely high! Adjust diet now',
            'Protein': '🚨 Protein too high! Consult nutritionist',
            'Calcium': '🚨 Calcium severely high! Check supplement intake',
            'Vitamin D': '🚨 Vitamin D too high! Stop supplements temporarily'
        }
    };

    const message = tipMessages[severity][nutritionName] || `${nutritionName} exceeds recommended amount by ${Math.round(percentage)}%`;

    const tip = document.createElement('div');
    tip.className = `nutrition-card-tip ${severity}`;
    tip.innerHTML = `<span>${message}</span>`;

    card.appendChild(tip);
}

// Remove tip from nutrition card
function removeNutritionCardTip(currentElement) {
    const card = currentElement.closest('.nutrition-card');
    if (!card) return;

    const existingTip = card.querySelector('.nutrition-card-tip');
    if (existingTip) {
        existingTip.remove();
    }
}

// Show nutrition alert banner
function showNutritionBanner(severeItems, moderateItems) {
    const banner = document.getElementById('nutrition-alert-banner');
    const alertText = document.getElementById('alert-text');
    const mainContent = document.querySelector('.main-content');

    if (!banner || !alertText) return;

    let message = '';
    if (severeItems.length > 0) {
        const item = severeItems[0];
        message = `🚨 ${item.name} intake severely high (${item.percentage}%) - adjust diet immediately`;
    } else if (moderateItems.length > 0) {
        const item = moderateItems[0];
        message = `⚠️ ${item.name} intake exceeds goal (${item.percentage}%) - choose lighter foods`;
    }

    alertText.textContent = message;
    banner.style.display = 'block';

    // Add margin to main content
    if (mainContent) {
        mainContent.classList.add('alert-shown');
    }
}

// Hide nutrition alert banner
function hideNutritionBanner() {
    const banner = document.getElementById('nutrition-alert-banner');
    const mainContent = document.querySelector('.main-content');

    if (banner) {
        banner.style.display = 'none';
    }

    if (mainContent) {
        mainContent.classList.remove('alert-shown');
    }
}

// Close nutrition alert banner
function closeNutritionAlert() {
    hideNutritionBanner();
}

// Clear all nutrition alerts (both banner and card tips)
function clearAllNutritionAlerts() {
    // Hide banner
    hideNutritionBanner();

    // Remove all card tips
    const allTips = document.querySelectorAll('.nutrition-card-tip');
    allTips.forEach(tip => tip.remove());
}

// Make functions available globally
window.closeNutritionAlert = closeNutritionAlert;
window.clearAllNutritionAlerts = clearAllNutritionAlerts;
