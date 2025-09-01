// ====== Nutrition Dashboard Integration ======
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
    resultsDiv.innerHTML = '<div style="text-align:center;color:#888;">Loading nutrition...</div>';
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
        } else {
            // (Optional: support manual input of ingredients)
            resultsDiv.innerHTML = '<div style="color:#888;text-align:center;">No recipe selected. Please provide ?id=xxx in URL.</div>';
            return;
        }
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
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch recipes');
    return await res.json();
}

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.querySelector('.search-input');
    const recipeCategorySelect = document.getElementById('recipe-category');
    const dietTypeSelect = document.getElementById('diet-type');
    const applyFiltersBtn = document.querySelector('.apply-filters-btn');
    const resultsHeader = document.querySelector('.results-header h2');
    const cardsContainer = document.querySelector('.recipe-cards-container');

    async function updateRecipes() {
        const keyword = searchInput ? searchInput.value.trim() : '';
        const category = recipeCategorySelect ? recipeCategorySelect.value : '';
        const habit = dietTypeSelect ? dietTypeSelect.value : '';
        if (cardsContainer) cardsContainer.innerHTML = '<div style="text-align:center;color:#888;">Loading...</div>';
        try {
            const { items = [] } = await fetchRecipes({ keyword, category, habit });
            if (cardsContainer) {
                cardsContainer.innerHTML = '';
                if (items.length === 0) {
                    cardsContainer.innerHTML = '<div style="text-align:center;color:#888;">No recipes found.</div>';
                } else {
                    items.forEach(r => {
                        const card = document.createElement('div');
                        card.className = 'recipe-card';
                        card.innerHTML = `
                            <div class="recipe-title">${r.title || ''}</div>
                            <div class="recipe-description">
                                <b>Habits:</b> ${(r.habits || []).join(', ') || '-'}<br/>
                                <b>Categories:</b> ${(r.categories || []).join(', ') || '-'}
                            </div>
                        `;
                        cardsContainer.appendChild(card);
                    });
                }
            }
            if (resultsHeader) {
                resultsHeader.textContent = `${items.length} Recipe${items.length !== 1 ? 's' : ''} Found`;
            }
        } catch (e) {
            if (cardsContainer) cardsContainer.innerHTML = `<div style="color:#c00;text-align:center;">${e.message}</div>`;
            if (resultsHeader) resultsHeader.textContent = '0 Recipes Found';
        }
    }

    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function () {
            updateRecipes();
        });
    }
    if (searchInput) {
        searchInput.addEventListener('keyup', function (e) {
            if (e.key === 'Enter') updateRecipes();
        });
    }
    // Optionally: fetch once on page load
    updateRecipes();
});
