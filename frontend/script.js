// ====== API Configuration ======
const NUTRITION_API = "https://0brixnxwq3.execute-api.ap-southeast-2.amazonaws.com/prod/match";

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

// Modal helpers
function ensureRecipeModal() {
    let m = document.getElementById('recipe-modal');
    if (m) return m;
    // Fallback: inject modal if missing
    const tpl = `
    <div id="recipe-modal" class="modal" aria-hidden="true" style="display:none">
        <div class="modal-backdrop"></div>
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="recipe-modal-title">
            <button class="modal-close" aria-label="Close">&times;</button>
            <h2 id="recipe-modal-title"></h2>
            <p id="recipe-brief" class="recipe-brief"></p>
            <div class="modal-cols">
                <div class="modal-col">
                    <h3>Ingredients</h3>
                    <ul id="recipe-ingredients"></ul>
                    <h3>Instructions</h3>
                    <ol id="recipe-directions"></ol>
                </div>
                <div class="modal-col">
                    <h3>Nutrition</h3>
                    <div id="nutrition-summary"></div>
                    <button id="add-to-dashboard" class="btn btn-primary" style="margin-top:1rem;">Add to Nutrition Dashboard</button>
                    <button id="view-dashboard" class="btn btn-secondary" style="margin-top:0.5rem;">View Nutrition Dashboard</button>
                </div>
            </div>
        </div>
    </div>`;
    const host = document.createElement('div');
    host.innerHTML = tpl;
    document.body.appendChild(host.firstElementChild);
    return document.getElementById('recipe-modal');
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
            const res = await fetch(NUTRITION_API, {
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
                    const pairs = [
                        { keys: ['calories', 'energy_kcal', 'energy'], unit: 'kcal', label: 'calories' },
                        { keys: ['protein', 'protein_g'], unit: 'g', label: 'protein' },
                        { keys: ['total_fat', 'fat', 'fat_g'], unit: 'g', label: 'fat' },
                        { keys: ['carbohydrates', 'carbohydrate_g', 'carbohydrates_g'], unit: 'g', label: 'carbohydrates' },
                        { keys: ['sodium', 'sodium_mg'], unit: 'mg', label: 'sodium' },
                        { keys: ['total_sugars', 'sugar', 'sugars', 'sugar_g'], unit: 'g', label: 'sugars' },
                        { keys: ['saturated_fats', 'saturated_fat', 'saturated_fats_g'], unit: 'g', label: 'saturated fats' }
                    ];
                    pairs.forEach(p => {
                        const v = getAny(summary, p.keys);
                        if (v == null) return;
                        const card = document.createElement('div'); card.className = 'card';
                        card.innerHTML = `<div class="key">${p.label}</div><div class="val">${fmt(v)} ${p.unit}</div>`;
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
    const carbohydratesCurrent = document.getElementById('carbohydrates-current');
    const carbohydratesGoal = document.getElementById('carbohydrates-goal');
    const sodiumCurrent = document.getElementById('sodium-current');
    const sodiumGoal = document.getElementById('sodium-goal');
    const overallProgress = document.getElementById('overall-progress');
    const overallProgressText = document.getElementById('overall-progress-text');
    // Progress bar
    const progressFill = document.querySelector('.progress-fill');
    let allIngredients = [];

    /* 思考（要不要加）
    // ====== Auto-reference recommended values ======
    // 默认 female_51，可根据实际需求切换
    const userType = window.localStorage.getItem('nss_user_type') || 'female_51';
    const goals = NUTRIENT_GOALS[userType] || NUTRIENT_GOALS['female_51'];
    // Map compact goals to DOM elements (if present)
    if (caloriesGoal) caloriesGoal.textContent = goals.calories_kcal;
    if (proteinGoal) proteinGoal.textContent = goals.protein_g;
    if (fiberGoal) fiberGoal.textContent = goals.fiber_g;
    // Optional goal elements: create or set sodium/calcium/vitD/vitB12 if present
    const sodiumGoalEl = document.getElementById('sodium-goal');
    if (sodiumGoalEl) sodiumGoalEl.textContent = goals.sodium_mg;
    const calciumGoalEl = document.getElementById('calcium-goal');
    if (calciumGoalEl) calciumGoalEl.textContent = goals.calcium_mg;
    const potassiumGoalEl = document.getElementById('potassium-goal');
    if (potassiumGoalEl) potassiumGoalEl.textContent = goals.potassium_mg;
    const vitDGoalEl = document.getElementById('vitaminD-goal');
    if (vitDGoalEl) vitDGoalEl.textContent = goals.vitaminD_IU;
    const vitB12GoalEl = document.getElementById('vitaminB12-goal');
    if (vitB12GoalEl) vitB12GoalEl.textContent = goals.vitaminB12_mcg;
    */
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
            if (carbohydratesCurrent) carbohydratesCurrent.textContent = '0';
            if (sodiumCurrent) sodiumCurrent.textContent = '0';
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
                { curId: 'carbohydrates-current', goalId: 'carbohydrates-goal' },
                { curId: 'sodium-current', goalId: 'sodium-goal' },
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

            return;
        }

        // Merge all ingredients
        for (const item of dashboard) {
            if (Array.isArray(item.ingredients)) {
                allIngredients = allIngredients.concat(item.ingredients);
            }
        }
        if (allIngredients.length === 0) {
            dashDiv.innerHTML = '<div style="color:#888;text-align:center;">No ingredients found in dashboard recipes.</div>';
            return;
        }

        // POST to MATCH_API
        const nutri = await fetchNutrition(allIngredients);
        const sum = nutri.summary_100g_sum || {};
        const details = nutri.details || [];

        // Update main cards (use aliases to tolerate backend naming differences)
        const caloriesVal = getAny(sum, ['calories', 'energy_kcal', 'energy']);
        const proteinVal = getAny(sum, ['protein', 'protein_g']);
        const carbVal = getAny(sum, ['carbohydrates', 'carbohydrate_g', 'carbohydrates_g']);
        const sodiumVal = getAny(sum, ['sodium', 'sodium_mg']);
        if (caloriesCurrent) caloriesCurrent.textContent = caloriesVal != null ? fmt(caloriesVal) : '-';
        if (proteinCurrent) proteinCurrent.textContent = proteinVal != null ? fmt(proteinVal) : '-';
        if (carbohydratesCurrent) carbohydratesCurrent.textContent = carbVal != null ? fmt(carbVal) : '-';
        if (sodiumCurrent) sodiumCurrent.textContent = sodiumVal != null ? formatNutritionValue(sodiumVal, 'Sodium') : '-';
        // Goals (can be static or configurable)
        const calGoal = caloriesGoal ? Number(caloriesGoal.textContent) : 2200;
        const proGoal = proteinGoal ? Number(proteinGoal.textContent) : 56;
        // Carbohydrates and sodium goals
        const carbGoal = carbohydratesGoal ? Number(carbohydratesGoal.textContent) : 130;
        const sodiumGoalVal = sodiumGoal ? Number(sodiumGoal.textContent) : 2300;

        // Progress calculation (simple average)
        let percent = 0;
        let count = 0;
        if (caloriesVal != null) { percent += Math.min(caloriesVal / calGoal, 1); count++; }
        if (proteinVal != null) { percent += Math.min(proteinVal / proGoal, 1); count++; }
        if (carbVal != null) { percent += Math.min(carbVal / carbGoal, 1); count++; }
        if (sodiumVal != null) { percent += Math.min(sodiumVal / sodiumGoalVal, 1); count++; }
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
            { curId: 'carbohydrates-current', goalId: 'carbohydrates-goal' },
            { curId: 'sodium-current', goalId: 'sodium-goal' },
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
            { keys: ['calories', 'energy_kcal', 'energy'], label: 'Calories', icon: 'fa-fire', unit: 'kcal' },
            { keys: ['protein', 'protein_g'], label: 'Protein', icon: 'fa-drumstick-bite', unit: 'g' },
            { keys: ['total_fat', 'fat', 'fat_g'], label: 'Fat', icon: 'fa-bacon', unit: 'g' },
            { keys: ['fiber', 'fiber_g', 'dietary_fiber'], label: 'Fiber', icon: 'fa-seedling', unit: 'g' },
            { keys: ['potassium', 'potassium_mg'], label: 'Potassium', icon: 'fa-bolt', unit: 'mg' },
            { keys: ['calcium', 'calcium_mg'], label: 'Calcium', icon: 'fa-bone', unit: 'mg' },
            { keys: ['vitaminD', 'vitaminD_IU', 'vitamin_d', 'vitamin_d_iu'], label: 'Vitamin D', icon: 'fa-sun', unit: 'IU' },
            { keys: ['vitaminB12', 'vitaminB12_mcg', 'vitamin_b12', 'vitamin_b12_mcg'], label: 'Vitamin B12', icon: 'fa-pills', unit: 'mcg' },
            { keys: ['sodium', 'sodium_mg'], label: 'Sodium', icon: 'fa-flask', unit: 'mg' },
            { keys: ['total_sugars', 'sugar', 'sugars', 'sugar_g'], label: 'Sugar', icon: 'fa-cube', unit: 'g' },
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
            html += '<thead><tr><th>Ingredient</th><th>Calories</th><th>Protein</th><th>Fat</th><th>Fiber</th><th>Potassium</th><th>Calcium</th><th>Vit D</th><th>Vit B12</th><th>Sodium</th><th>Sugar</th></tr></thead><tbody>';
            details.forEach(d => {
                const rowCalories = getAny(d, ['calories', 'energy_kcal', 'energy']);
                const rowProtein = getAny(d, ['protein', 'protein_g']);
                const rowFat = getAny(d, ['total_fat', 'fat', 'fat_g']);
                const rowFiber = getAny(d, ['fiber', 'fiber_g', 'dietary_fiber']);
                const rowPotassium = getAny(d, ['potassium', 'potassium_mg']);
                const rowCalcium = getAny(d, ['calcium', 'calcium_mg']);
                const rowVitD = getAny(d, ['vitaminD', 'vitaminD_IU', 'vitamin_d', 'vitamin_d_iu']);
                const rowVitB12 = getAny(d, ['vitaminB12', 'vitaminB12_mcg', 'vitamin_b12', 'vitamin_b12_mcg']);
                const rowSodium = getAny(d, ['sodium', 'sodium_mg']);
                const rowSugar = getAny(d, ['total_sugars', 'sugar', 'sugars', 'sugar_g']);
                html += `<tr>
                    <td>${d.ingredient || '-'}</td>
                    <td>${rowCalories != null ? fmt(rowCalories) : '-'}</td>
                    <td>${rowProtein != null ? fmt(rowProtein) : '-'}</td>
                    <td>${rowFat != null ? fmt(rowFat) : '-'}</td>
                    <td>${rowFiber != null ? fmt(rowFiber) : '-'}</td>
                    <td>${rowPotassium != null ? fmt(rowPotassium) + ' mg' : '-'}</td>
                    <td>${rowCalcium != null ? fmt(rowCalcium) + ' mg' : '-'}</td>
                    <td>${rowVitD != null ? fmt(rowVitD) + ' IU' : '-'}</td>
                    <td>${rowVitB12 != null ? fmt(rowVitB12) + ' mcg' : '-'}</td>
                    <td>${rowSodium != null ? fmt(rowSodium) : '-'}</td>
                    <td>${rowSugar != null ? fmt(rowSugar) : '-'}</td>
                </tr>`;
            });
            html += '</tbody></table>';
        }
        dashDiv.innerHTML = html;
    } catch (e) {
        dashDiv.innerHTML = `<div style="color:#c00;text-align:center;">${e.message}</div>`;
    }
}

const RECIPES_API = "https://97xkjqjeuc.execute-api.ap-southeast-2.amazonaws.com/prod/recipes";

async function fetchNutrition(ingredients) {
    // Accept either array of strings or array of objects { text }
    const normalized = (ingredients || []).map(s => typeof s === 'string' ? { text: s } : s || { text: '' });
    // Infer labels for each ingredient (if not provided)
    normalized.forEach(it => { if (!it.label) it.label = inferLabelFromText(it.text || it.name || ''); });
    const res = await fetch(NUTRITION_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: normalized })
    });
    if (!res.ok) throw new Error('Failed to fetch nutrition');
    return await res.json();
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

// Adjust unrealistic nutrition values that are likely from API accumulation issues
function adjustNutritionValue(value, label) {
    if (value == null) return null;

    // Handle unrealistic values from nutrition API accumulation 
    // Values appear to be accumulated per 100g for each ingredient, need scaling down
    switch (label) {
        case 'Sodium':
            // Normal serving should be 200-800mg
            // API values like 40,000mg suggest accumulation issue
            if (value > 5000) {
                return Math.round(value / 1000 * 400); // Scale down and adjust to realistic serving
            } else if (value > 2000) {
                return Math.round(value / 3);
            }
            break;
        case 'Potassium':
            // Normal serving should be 200-600mg
            if (value > 8000) {
                return Math.round(value / 1000 * 300);
            } else if (value > 2000) {
                return Math.round(value / 4);
            }
            break;
        case 'Calcium':
            // Normal serving should be 50-300mg
            if (value > 3000) {
                return Math.round(value / 1000 * 200);
            } else if (value > 1000) {
                return Math.round(value / 5);
            }
            break;
        case 'Calories':
            // Calories: normal serving should be 200-800 kcal
            if (value > 3000) {
                return Math.round(value / 6);
            } else if (value > 2000) {
                return Math.round(value / 4);
            }
            break;
        case 'Protein':
            // Protein: normal serving should be 5-30g
            if (value > 100) {
                return Math.round(value / 5);
            } else if (value > 50) {
                return Math.round(value / 3);
            }
            break;
        case 'Fat':
            // Fat: normal serving should be 2-20g
            if (value > 80) {
                return Math.round(value / 6);
            } else if (value > 40) {
                return Math.round(value / 4);
            }
            break;
    }

    return value;
}

function formatNutritionValue(raw, label) {
    const adjusted = adjustNutritionValue(raw, label);
    if (adjusted == null) return '-';

    // Add ~ prefix if value was adjusted
    const prefix = (adjusted !== raw && raw != null) ? '~' : '';
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
            const url = `${RECIPES_API}?recipe_id=${encodeURIComponent(recipeId)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Recipe not found');
            const data = await res.json();
            const recipe = (data.items && data.items[0]) || null;
            if (!recipe || !recipe.ingredients) throw new Error('No ingredients found for this recipe');
            ingredients = recipe.ingredients;
            // Step 2: fetch nutrition summary
            const nutri = await fetchNutrition(ingredients);
            const sum = nutri.summary_100g_sum || {};
            const fields = [
                { keys: ['calories', 'energy_kcal', 'energy'], label: 'Calories', icon: 'fa-fire', unit: 'kcal' },
                { keys: ['protein', 'protein_g'], label: 'Protein', icon: 'fa-drumstick-bite', unit: 'g' },
                { keys: ['total_fat', 'fat', 'fat_g'], label: 'Fat', icon: 'fa-bacon', unit: 'g' },
                { keys: ['fiber', 'fiber_g', 'dietary_fiber'], label: 'Fiber', icon: 'fa-seedling', unit: 'g' },
                { keys: ['potassium', 'potassium_mg'], label: 'Potassium', icon: 'fa-bolt', unit: 'mg' },
                { keys: ['calcium', 'calcium_mg'], label: 'Calcium', icon: 'fa-bone', unit: 'mg' },
                { keys: ['vitaminD', 'vitaminD_IU', 'vitamin_d', 'vitamin_d_iu'], label: 'Vitamin D', icon: 'fa-sun', unit: 'IU' },
                { keys: ['vitaminB12', 'vitaminB12_mcg', 'vitamin_b12', 'vitamin_b12_mcg'], label: 'Vitamin B12', icon: 'fa-pills', unit: 'mcg' },
                { keys: ['sodium', 'sodium_mg'], label: 'Sodium', icon: 'fa-flask', unit: 'mg' },
                { keys: ['total_sugars', 'sugar', 'sugars', 'sugar_g'], label: 'Sugar', icon: 'fa-cube', unit: 'g' },
            ];
            resultsDiv.innerHTML = '<div class="nutrition-cards"></div>';
            const cards = resultsDiv.querySelector('.nutrition-cards');
            fields.forEach(f => {
                const raw = getAny(sum, f.keys);
                const val = raw != null ? fmt(raw) : '-';
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

async function fetchRecipes({ keyword, category, habit, diet_type, allergy_filter, limit = 10, nextToken = null }) {
    const params = new URLSearchParams();
    if (keyword) params.append('title_prefix', keyword);
    if (category && category !== 'all') params.append('category', category);
    if (habit && habit !== 'all') params.append('habit', habit);
    if (diet_type && diet_type !== 'all') params.append('diet_type', diet_type);
    if (allergy_filter && allergy_filter !== 'all') params.append('allergy_filter', allergy_filter);
    if (limit) params.append('limit', limit);
    if (nextToken) params.append('next_token', nextToken);
    const url = `${RECIPES_API}?${params.toString()}`;
    // 8s timeout handling (backend sometimes slower) -> more tolerant
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let res;
    try {
        res = await fetch(url, { signal: controller.signal });
    } catch (e) {
        if (e.name === 'AbortError') throw new Error('Search timeout, please try again.');
        throw e;
    } finally {
        clearTimeout(timeout);
    }
    if (!res.ok) {
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
    const modalDashboardBtn = modal ? modal.querySelector('.modal-dashboard-btn') : null;

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
                const fields = [
                    { keys: ['calories', 'energy_kcal', 'energy'], label: 'Calories', icon: 'fa-fire', unit: 'kcal' },
                    { keys: ['protein', 'protein_g'], label: 'Protein', icon: 'fa-drumstick-bite', unit: 'g' },
                    { keys: ['total_fat', 'fat', 'fat_g'], label: 'Fat', icon: 'fa-bacon', unit: 'g' },
                    { keys: ['fiber', 'fiber_g', 'dietary_fiber'], label: 'Fiber', icon: 'fa-seedling', unit: 'g' },
                    { keys: ['potassium', 'potassium_mg'], label: 'Potassium', icon: 'fa-bolt', unit: 'mg' },
                    { keys: ['calcium', 'calcium_mg'], label: 'Calcium', icon: 'fa-bone', unit: 'mg' },
                    { keys: ['vitaminD', 'vitaminD_IU', 'vitamin_d', 'vitamin_d_iu'], label: 'Vitamin D', icon: 'fa-sun', unit: 'IU' },
                    { keys: ['vitaminB12', 'vitaminB12_mcg', 'vitamin_b12', 'vitamin_b12_mcg'], label: 'Vitamin B12', icon: 'fa-pills', unit: 'mcg' },
                    { keys: ['sodium', 'sodium_mg'], label: 'Sodium', icon: 'fa-flask', unit: 'mg' },
                    { keys: ['total_sugars', 'sugar', 'sugars', 'sugar_g'], label: 'Sugar', icon: 'fa-cube', unit: 'g' },
                ];
                let html = '<div class="nutrition-cards">';
                fields.forEach(f => {
                    const raw = getAny(sum, f.keys);
                    const val = raw != null ? fmt(raw) : '-';
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
                try { dashboard = JSON.parse(localStorage.getItem('nss_dashboard')) || []; } catch { }
                if (!dashboard.some(r => r.recipe_id === recipe.recipe_id)) {
                    dashboard.push(recipe);
                    localStorage.setItem('nss_dashboard', JSON.stringify(dashboard));
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
        modalDashboardBtn.textContent = 'Add to Dashboard';
        modalDashboardBtn.disabled = false;
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
                const res = await fetch(`${RECIPES_API}?recipe_id=${encodeURIComponent(id)}`);
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
                const fields = [
                    { keys: ['calories', 'energy_kcal', 'energy'], label: 'Calories', icon: 'fa-fire', unit: 'kcal' },
                    { keys: ['protein', 'protein_g'], label: 'Protein', icon: 'fa-drumstick-bite', unit: 'g' },
                    { keys: ['total_fat', 'fat', 'fat_g'], label: 'Fat', icon: 'fa-bacon', unit: 'g' },
                    { keys: ['fiber', 'fiber_g', 'dietary_fiber'], label: 'Fiber', icon: 'fa-seedling', unit: 'g' },
                    { keys: ['potassium', 'potassium_mg'], label: 'Potassium', icon: 'fa-bolt', unit: 'mg' },
                    { keys: ['calcium', 'calcium_mg'], label: 'Calcium', icon: 'fa-bone', unit: 'mg' },
                    { keys: ['vitaminD', 'vitaminD_IU', 'vitamin_d', 'vitamin_d_iu'], label: 'Vitamin D', icon: 'fa-sun', unit: 'IU' },
                    { keys: ['vitaminB12', 'vitaminB12_mcg', 'vitamin_b12', 'vitamin_b12_mcg'], label: 'Vitamin B12', icon: 'fa-pills', unit: 'mcg' },
                    { keys: ['sodium', 'sodium_mg'], label: 'Sodium', icon: 'fa-flask', unit: 'mg' },
                    { keys: ['total_sugars', 'sugar', 'sugars', 'sugar_g'], label: 'Sugar', icon: 'fa-cube', unit: 'g' },
                ];
                nutritionResults.innerHTML = '<div class="nutrition-cards"></div>';
                const cards = nutritionResults.querySelector('.nutrition-cards');
                fields.forEach(f => {
                    const raw = getAny(sum, f.keys);
                    const val = formatNutritionValue(raw, f.label);
                    const card = document.createElement('div');
                    card.className = 'nutrition-card';
                    card.innerHTML = `
                            <div class="nutrition-icon"><i class="fas ${f.icon}"></i></div>
                            <div class="nutrition-label">${f.label}</div>
                            <div class="nutrition-value">${val}${f.unit ? ' ' + f.unit : ''}</div>
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

    // Sort recipes by nutrition values
    async function sortRecipesByNutrition(recipes, sortBy) {
        if (sortBy === 'default' || !recipes.length) return recipes;

        // Fetch nutrition data for all recipes
        const recipesWithNutrition = await Promise.all(
            recipes.map(async (recipe) => {
                try {
                    const nutrition = await fetchNutrition(recipe.ingredients || []);
                    const sum = nutrition.summary_100g_sum || {};
                    return {
                        ...recipe,
                        nutritionData: {
                            calories: adjustNutritionValue(getAny(sum, ['calories', 'energy_kcal', 'energy']) || 0, 'Calories'),
                            protein: adjustNutritionValue(getAny(sum, ['protein', 'protein_g']) || 0, 'Protein'),
                            fat: adjustNutritionValue(getAny(sum, ['total_fat', 'fat', 'fat_g']) || 0, 'Fat'),
                            sodium: adjustNutritionValue(getAny(sum, ['sodium', 'sodium_mg']) || 0, 'Sodium')
                        }
                    };
                } catch (error) {
                    return {
                        ...recipe,
                        nutritionData: { calories: 0, protein: 0, fat: 0, sodium: 0 }
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
                case 'fat-high':
                    return bNutrition.fat - aNutrition.fat;
                case 'fat-low':
                    return aNutrition.fat - bNutrition.fat;
                case 'sodium-high':
                    return bNutrition.sodium - aNutrition.sodium;
                case 'sodium-low':
                    return aNutrition.sodium - bNutrition.sodium;
                default:
                    return 0;
            }
        });

        return sorted;
    }

    async function updateRecipes(reset = true) {
        const keyword = searchInput ? searchInput.value.trim() : '';
        const category = recipeCategorySelect ? recipeCategorySelect.value : '';
        const diet_type = dietTypeSelect ? dietTypeSelect.value : '';
        const allergy_filter = allergyFilterSelect ? allergyFilterSelect.value : '';
        const sortBy = sortBySelect ? sortBySelect.value : 'default';
        if (reset) {
            nextToken = null;
            lastQuery = { keyword, category, diet_type, allergy_filter, sortBy };
        }
        if (cardsContainer && reset) cardsContainer.innerHTML = '<div style="text-align:center;color:#888;">Loading...</div>';
        try {
            const { items = [], next_token } = await fetchRecipes({ keyword, category, diet_type, allergy_filter, nextToken: reset ? null : nextToken });
            let filteredItems = items;
            // Strict category match: only show recipes whose categories exactly match the selected category
            if (category && category !== 'all') {
                filteredItems = items.filter(r => Array.isArray(r.categories) && r.categories.includes(category));
            }

            // Apply sorting by nutrition values
            if (sortBy !== 'default') {
                if (cardsContainer && reset) cardsContainer.innerHTML = '<div style="text-align:center;color:#888;">Loading nutrition data for sorting...</div>';
                filteredItems = await sortRecipesByNutrition(filteredItems, sortBy);
            }
            if (cardsContainer) {
                if (reset) cardsContainer.innerHTML = '';
                if (filteredItems.length === 0 && reset) {
                    cardsContainer.innerHTML = '<div style="text-align:center;color:#888;">No related recipes provided</div>';
                } else {
                    filteredItems.forEach(r => {
                        const card = document.createElement('div');
                        card.className = 'recipe-card';
                        card.tabIndex = 0;
                        card.style.cursor = 'pointer';
                        card.setAttribute('data-id', r.recipe_id || r.id || '');
                        card._recipe = r;
                        // Group tags into 3 types
                        const habits = r.habits || [];
                        const dietTags = habits.filter(h => ['vegetarian', 'vegan', 'low_sugar', 'low_sodium', 'heart_healthy', 'diabetic_friendly', 'soft_food'].includes(h))
                            .map(h => `<span class="tag diet-tag">${h}</span>`).join('');
                        const allergyTags = habits.filter(h => ['dairy_free', 'gluten_free', 'nut_free', 'shellfish_free', 'egg_free', 'soy_free', 'fish_free'].includes(h))
                            .map(h => `<span class="tag allergy-tag">${h}</span>`).join('');
                        const categoryTags = (r.categories || []).map(c => `<span class="tag category-tag">${c}</span>`).join('');

                        // Add nutrition info if available from sorting
                        let nutritionInfo = '';
                        if (r.nutritionData) {
                            const data = r.nutritionData;
                            nutritionInfo = `<div class="recipe-nutrition-info">
                                <span class="nutrition-item">🔥 ${data.calories.toFixed(0)} kcal</span>
                                <span class="nutrition-item">💪 ${data.protein.toFixed(1)}g protein</span>
                                <span class="nutrition-item">🥑 ${data.fat.toFixed(1)}g fat</span>
                                <span class="nutrition-item">🧂 ${adjustNutritionValue(data.sodium, 'Sodium').toFixed(0)}mg sodium</span>
                            </div>`;
                        }

                        // Add image if available
                        const imageHtml = r.has_image && r.image_display ?
                            `<div class="recipe-image"><img src="${r.image_display}" alt="${r.title}" onerror="this.parentElement.innerHTML='<i class=\\"fas fa-utensils\\" style=\\"color:#ccc;font-size:3rem;\\"></i>'"></div>` :
                            `<div class="recipe-image-placeholder"><i class="fas fa-utensils"></i></div>`;

                        card.innerHTML = `
                            ${imageHtml}
                            <div class="recipe-content">
                                <div class="recipe-title">${r.title || ''}</div>
                                ${nutritionInfo}
                                <div class="recipe-tags-row">
                                    <div class="recipe-tags diet-tags-group">${dietTags}</div>
                                    <div class="recipe-tags allergy-tags-group">${allergyTags}</div>
                                    <div class="recipe-tags category-tags-group">${categoryTags}</div>
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
                loadMoreBtn.onclick = function () { updateRecipes(false); };
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
                                const dietTags = habits.filter(h => ['vegetarian', 'vegan', 'low_sugar', 'low_sodium', 'heart_healthy', 'diabetic_friendly', 'soft_food'].includes(h))
                                    .map(h => `<span class="tag diet-tag">${h}</span>`).join('');
                                const allergyTags = habits.filter(h => ['dairy_free', 'gluten_free', 'nut_free', 'shellfish_free', 'egg_free', 'soy_free', 'fish_free'].includes(h))
                                    .map(h => `<span class="tag allergy-tag">${h}</span>`).join('');
                                const categoryTags = (r.categories || []).map(c => `<span class="tag category-tag">${c}</span>`).join('');
                                // Add image if available  
                                const imageHtml = r.has_image && r.image_display ?
                                    `<div class="recipe-image"><img src="${r.image_display}" alt="${r.title}" onerror="this.parentElement.innerHTML='<i class=\\"fas fa-utensils\\" style=\\"color:#ccc;font-size:3rem;\\"></i>'"></div>` :
                                    `<div class="recipe-image-placeholder"><i class="fas fa-utensils"></i></div>`;

                                card.innerHTML = `
                                        ${imageHtml}
                                        <div class="recipe-content">
                                            <div class="recipe-title">${r.title || ''}</div>
                                            <div class="recipe-tags-row">
                                                <div class="recipe-tags diet-tags-group">${dietTags}</div>
                                                <div class="recipe-tags allergy-tags-group">${allergyTags}</div>
                                                <div class="recipe-tags category-tags-group">${categoryTags}</div>
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
