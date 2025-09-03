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
document.addEventListener('click', (e)=>{
    if (e.target.closest('.modal-close') || e.target.classList.contains('modal-backdrop')) {
        closeModal();
    }
});

// Open recipe modal and fetch nutrition summary
async function openRecipeModal(recipe) {
    const m = ensureRecipeModal();
    const titleEl = m.querySelector('#recipe-modal-title');
    const briefEl = m.querySelector('#recipe-brief');
    const ingEl = m.querySelector('#recipe-ingredients');
    const dirEl = m.querySelector('#recipe-directions');
    const sumEl = m.querySelector('#nutrition-summary');

    if (titleEl) titleEl.textContent = recipe.title || '';
    if (briefEl) briefEl.textContent = Array.isArray(recipe.directions) && recipe.directions.length ? recipe.directions[0] : (recipe.link || '');
    if (ingEl) {
        ingEl.innerHTML = '';
        (recipe.ingredients || []).forEach(s => {
            const li = document.createElement('li'); li.textContent = s; ingEl.appendChild(li);
        });
    }
    if (dirEl) {
        dirEl.innerHTML = '';
        (recipe.directions || []).forEach(s => {
            const li = document.createElement('li'); li.textContent = s; dirEl.appendChild(li);
        });
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
                        ['calories','kcal'],['protein','g'],['total_fat','g'],
                        ['carbohydrates','g'],['sodium','mg'],['total_sugars','g'],['saturated_fats','g']
                    ];
                    pairs.forEach(([k,u])=>{
                        const v = summary?.[k];
                        if (v==null) return;
                        const card = document.createElement('div'); card.className='card';
                        card.innerHTML = `<div class="key">${k.replace('_',' ')}</div><div class="val">${Number(v).toFixed(1)} ${u}</div>`;
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
        addBtn.onclick = () => {
            const key = 'nss_dashboard';
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            list.push({
                id: recipe.recipe_id,
                title: recipe.title,
                ingredients: recipe.ingredients,
                added_at: Date.now()
            });
            localStorage.setItem(key, JSON.stringify(list));
            addBtn.textContent = 'Added!';
            setTimeout(()=> addBtn.textContent = 'Add to Nutrition Dashboard', 1200);
        };
    }
}

// ====== Nutrition Dashboard Integration ======
// ====== Dashboard Nutrition Rendering ======
const DASHBOARD_KEY = 'nss_dashboard';

async function renderDashboardNutrition() {
    const dashDiv = document.getElementById('dashboard-nutrition');
    if (!dashDiv) return;
    dashDiv.innerHTML = '<div style="text-align:center;color:#888;">Loading dashboard nutrition...</div>';
    // Main card hooks
    const caloriesCurrent = document.getElementById('calories-current');
    const caloriesGoal = document.getElementById('calories-goal');
    const proteinCurrent = document.getElementById('protein-current');
    const proteinGoal = document.getElementById('protein-goal');
    const fiberCurrent = document.getElementById('fiber-current');
    const fiberGoal = document.getElementById('fiber-goal');
    const waterCurrent = document.getElementById('water-current');
    const waterGoal = document.getElementById('water-goal');
    const overallProgress = document.getElementById('overall-progress');
    const overallProgressText = document.getElementById('overall-progress-text');
    // Progress bar
    const progressFill = document.querySelector('.progress-fill');
    let allIngredients = [];

    // 思考
    try {
        // Read dashboard from localStorage
        let dashboard = [];
        try {
            dashboard = JSON.parse(localStorage.getItem(DASHBOARD_KEY)) || [];
        } catch {}
        if (!Array.isArray(dashboard) || dashboard.length === 0) {
            dashDiv.innerHTML = '<div style="color:#888;text-align:center;">No dashboard recipes found.</div>';
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
        // Update main cards
        if (caloriesCurrent) caloriesCurrent.textContent = sum.calories != null ? Number(sum.calories).toFixed(0) : '0';
        if (proteinCurrent) proteinCurrent.textContent = sum.protein != null ? Number(sum.protein).toFixed(0) : '0';
        if (fiberCurrent) fiberCurrent.textContent = sum.fiber != null ? Number(sum.fiber).toFixed(0) : '0';
        if (waterCurrent) waterCurrent.textContent = sum.water != null ? Number(sum.water).toFixed(0) : '0';
        // Goals (can be static or configurable)
        const calGoal = caloriesGoal ? Number(caloriesGoal.textContent) : 2000;
        const proGoal = proteinGoal ? Number(proteinGoal.textContent) : 80;
        const fibGoal = fiberGoal ? Number(fiberGoal.textContent) : 30;
        const watGoal = waterGoal ? Number(waterGoal.textContent) : 8;
        // Progress calculation (simple average)
        let percent = 0;
        let count = 0;
        if (sum.calories != null) { percent += Math.min(sum.calories / calGoal, 1); count++; }
        if (sum.protein != null) { percent += Math.min(sum.protein / proGoal, 1); count++; }
        if (sum.fiber != null) { percent += Math.min(sum.fiber / fibGoal, 1); count++; }
        if (sum.water != null) { percent += Math.min(sum.water / watGoal, 1); count++; }
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
            { curId: 'fiber-current', goalId: 'fiber-goal' },
            { curId: 'water-current', goalId: 'water-goal' },
        ];
        cardFields.forEach(({curId, goalId}) => {
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
        // Render dashboard summary below
        const fields = [
            { key: 'calories', label: 'Calories', icon: 'fa-fire' },
            { key: 'protein', label: 'Protein', icon: 'fa-drumstick-bite' },
            { key: 'fat', label: 'Fat', icon: 'fa-bacon' },
            { key: 'sodium', label: 'Sodium', icon: 'fa-salt-shaker' },
            { key: 'sugar', label: 'Sugar', icon: 'fa-cube' },
        ];
        let html = '<div class="nutrition-cards">';
        fields.forEach(f => {
            const val = sum[f.key] != null ? sum[f.key] : '-';
            html += `<div class="nutrition-card">
                <div class="nutrition-icon"><i class="fas ${f.icon}"></i></div>
                <div class="nutrition-label">${f.label}</div>
                <div class="nutrition-value">${val}</div>
            </div>`;
        });
        html += '</div>';
        // Render details table
        if (details.length > 0) {
            html += '<h3 style="margin-top:2rem;">Ingredient Details</h3>';
            html += '<table class="nutrition-details-table" style="width:100%;margin-top:1rem;border-collapse:collapse;">';
            html += '<thead><tr><th>Ingredient</th><th>Calories</th><th>Protein</th><th>Fat</th><th>Sodium</th><th>Sugar</th></tr></thead><tbody>';
            details.forEach(d => {
                html += `<tr>
                    <td>${d.ingredient || '-'}</td>
                    <td>${d.calories != null ? d.calories : '-'}</td>
                    <td>${d.protein != null ? d.protein : '-'}</td>
                    <td>${d.fat != null ? d.fat : '-'}</td>
                    <td>${d.sodium != null ? d.sodium : '-'}</td>
                    <td>${d.sugar != null ? d.sugar : '-'}</td>
                </tr>`;
            });
            html += '</tbody></table>';
        }
        dashDiv.innerHTML = html;
    } catch (e) {
        dashDiv.innerHTML = `<div style="color:#c00;text-align:center;">${e.message}</div>`;
    }
}

const NUTRITION_API = "https://0brixnxwq3.execute-api.ap-southeast-2.amazonaws.com/prod/match";
const RECIPES_API = "https://97xkjqjeuc.execute-api.ap-southeast-2.amazonaws.com/prod/recipes";

async function fetchNutrition(ingredients) {
    const res = await fetch(NUTRITION_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients })
    });
    if (!res.ok) throw new Error('Failed to fetch nutrition');
    return await res.json();
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
                { key: 'calories', label: 'Calories', icon: 'fa-fire' },
                { key: 'protein', label: 'Protein', icon: 'fa-drumstick-bite' },
                { key: 'fat', label: 'Fat', icon: 'fa-bacon' },
                { key: 'sodium', label: 'Sodium', icon: 'fa-salt-shaker' },
                { key: 'sugar', label: 'Sugar', icon: 'fa-cube' },
            ];
            resultsDiv.innerHTML = '<div class="nutrition-cards"></div>';
            const cards = resultsDiv.querySelector('.nutrition-cards');
            fields.forEach(f => {
                const val = sum[f.key] != null ? sum[f.key] : '-';
                const card = document.createElement('div');
                card.className = 'nutrition-card';
                card.innerHTML = `
                    <div class="nutrition-icon"><i class="fas ${f.icon}"></i></div>
                    <div class="nutrition-label">${f.label}</div>
                    <div class="nutrition-value">${val}</div>
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
    document.addEventListener('DOMContentLoaded', renderNutritionDashboard);
}

async function fetchRecipes({ keyword, category, habit, limit = 10, nextToken = null }) {
    const params = new URLSearchParams();
    if (keyword) params.append('title_prefix', keyword);
    if (category && category !== 'all') params.append('category', category);
    if (habit && habit !== 'all') params.append('habit', habit);
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
        const txt = await res.text().catch(()=>res.statusText || '');
        const message = `Recipes API ${res.status} ${res.statusText} ${txt ? '- '+txt.slice(0,120) : ''}`;
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
                  .sort((a,b)=>a.score-b.score);
            }
        }
        function levenshtein(a, b) {
            const matrix = [];
            for (let i = 0; i <= b.length; i++) matrix[i] = [i];
            for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
            for (let i = 1; i <= b.length; i++) {
                for (let j = 1; j <= a.length; j++) {
                    if (b.charAt(i-1) === a.charAt(j-1)) matrix[i][j] = matrix[i-1][j-1];
                    else matrix[i][j] = Math.min(matrix[i-1][j-1]+1, matrix[i][j]+1, matrix[i-1][j]+1);
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
    // Features section routing
    const mealPlanning = document.getElementById('feature-meal-planning');
    const shoppingList = document.getElementById('feature-shopping-list');
    const recommendations = document.getElementById('feature-recommendations');
    if (mealPlanning) mealPlanning.addEventListener('click', function(e) { e.preventDefault(); window.location.href = 'meal-planning.html'; });
    if (shoppingList) shoppingList.addEventListener('click', function(e) { e.preventDefault(); window.location.href = 'shopping-list.html'; });
    if (recommendations) recommendations.addEventListener('click', function(e) { e.preventDefault(); window.location.href = 'daily-recommendations.html'; });
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
                        { key: 'calories', label: 'Calories', icon: 'fa-fire' },
                        { key: 'protein', label: 'Protein', icon: 'fa-drumstick-bite' },
                        { key: 'fat', label: 'Fat', icon: 'fa-bacon' },
                        { key: 'sodium', label: 'Sodium', icon: 'fa-salt-shaker' },
                        { key: 'sugar', label: 'Sugar', icon: 'fa-cube' },
                    ];
                    let html = '<div class="nutrition-cards">';
                    fields.forEach(f => {
                        const val = sum[f.key] != null ? sum[f.key] : '-';
                        html += `<div class="nutrition-card">
                            <div class="nutrition-icon"><i class="fas ${f.icon}"></i></div>
                            <div class="nutrition-label">${f.label}</div>
                            <div class="nutrition-value">${val}</div>
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
            modalDashboardBtn.onclick = function() {
                let dashboard = [];
                try { dashboard = JSON.parse(localStorage.getItem('nss_dashboard')) || []; } catch {}
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

    modalCloseBtn.onclick = closeModal;
    modalBackdrop.onclick = closeModal;
    const searchInput = document.querySelector('.search-input');
    const recipeCategorySelect = document.getElementById('recipe-category');
    const dietTypeSelect = document.getElementById('diet-type');
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
        try { dashboard = JSON.parse(localStorage.getItem(dashboardKey)) || []; } catch {}
        const isFav = dashboard.some(r => r.recipe_id === recipe.recipe_id);
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
                <div class="modal-section">
                    <b>Ingredients:</b> ${(recipe.ingredients || []).join(', ') || '-'}
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
        closeBtn.onkeydown = function(e) { if (e.key === 'Enter' || e.key === ' ') closeModal(); };
        function closeModal() {
            modalContainer.style.display = 'none';
            modalContainer.innerHTML = '';
        }

        // Nutrition match button
        const nutritionBtn = modal.querySelector('.nutrition-match-btn');
        const nutritionResults = modal.querySelector('.nutrition-modal-results');
        nutritionBtn.onclick = async function() {
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
                        { key: 'calories', label: 'Calories', icon: 'fa-fire' },
                        { key: 'protein', label: 'Protein', icon: 'fa-drumstick-bite' },
                        { key: 'fat', label: 'Fat', icon: 'fa-bacon' },
                        { key: 'sodium', label: 'Sodium', icon: 'fa-salt-shaker' },
                        { key: 'sugar', label: 'Sugar', icon: 'fa-cube' },
                    ];
                    nutritionResults.innerHTML = '<div class="nutrition-cards"></div>';
                    const cards = nutritionResults.querySelector('.nutrition-cards');
                    fields.forEach(f => {
                        const val = sum[f.key] != null ? sum[f.key] : '-';
                        const card = document.createElement('div');
                        card.className = 'nutrition-card';
                        card.innerHTML = `
                            <div class="nutrition-icon"><i class="fas ${f.icon}"></i></div>
                            <div class="nutrition-label">${f.label}</div>
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
        favBtn.onclick = function() {
            let dashboard = [];
            try { dashboard = JSON.parse(localStorage.getItem(dashboardKey)) || []; } catch {}
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

    async function updateRecipes(reset = true) {
        const keyword = searchInput ? searchInput.value.trim() : '';
        const category = recipeCategorySelect ? recipeCategorySelect.value : '';
        const habit = dietTypeSelect ? dietTypeSelect.value : '';
        if (reset) {
            nextToken = null;
            lastQuery = { keyword, category, habit };
        }
        if (cardsContainer && reset) cardsContainer.innerHTML = '<div style="text-align:center;color:#888;">Loading...</div>';
        try {
            const { items = [], next_token } = await fetchRecipes({ keyword, category, habit, nextToken: reset ? null : nextToken });
            let filteredItems = items;
            // Strict category match: only show recipes whose categories exactly match the selected category
            if (category && category !== 'all') {
                filteredItems = items.filter(r => Array.isArray(r.categories) && r.categories.includes(category));
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
                        // Group tags: health (habits) and category
                        const healthTags = (r.habits || []).map(h => `<span class="tag health-tag">${h}</span>`).join('');
                        const categoryTags = (r.categories || []).map(c => `<span class="tag category-tag">${c}</span>`).join('');
                        card.innerHTML = `
                            <div class="recipe-title">${r.title || ''}</div>
                            <div class="recipe-description">${r.description || ''}</div>
                            <div class="recipe-tags-row">
                                <div class="recipe-tags health-tags-group">${healthTags}</div>
                                <div class="recipe-tags category-tags-group">${categoryTags}</div>
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
                loadMoreBtn.onclick = function() { updateRecipes(false); };
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
                        const fallback = await fetchRecipes({ keyword: '', category, habit, limit });
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
                                    const healthTags = (r.habits || []).map(h => `<span class="tag health-tag">${h}</span>`).join('');
                                    const categoryTags = (r.categories || []).map(c => `<span class="tag category-tag">${c}</span>`).join('');
                                    card.innerHTML = `
                                        <div class="recipe-title">${r.title || ''}</div>
                                        <div class="recipe-description">${r.description || ''}</div>
                                        <div class="recipe-tags-row">
                                            <div class="recipe-tags health-tags-group">${healthTags}</div>
                                            <div class="recipe-tags category-tags-group">${categoryTags}</div>
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
