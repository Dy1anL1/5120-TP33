<template>
  <div class="recipes">
    <section class="page-header">
      <h1>Explore Recipes</h1>
      <p>Discover thousands of senior-friendly recipes tailored to your health needs</p>
    </section>

    <section class="search-section">
      <div class="search-container">
        <input
          type="text"
          placeholder="Search for recipes..."
          class="search-input"
          v-model="searchQuery"
          @keyup.enter="doSearch"
        />
        <button class="search-button" @click="doSearch">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
            />
          </svg>
        </button>
      </div>
      <div v-if="loading" style="text-align:center;margin-top:1rem;">Loading...</div>
      <div v-if="error" style="color:red;text-align:center;margin-top:1rem;">{{ error }}</div>
    </section>

    <section class="filters">
      <div class="filter-tags">
        <span class="filter-tag active">All</span>
        <span class="filter-tag">Low Sodium</span>
        <span class="filter-tag">Diabetic Friendly</span>
        <span class="filter-tag">Heart Healthy</span>
        <span class="filter-tag">Quick & Easy</span>
      </div>
    </section>

    <section class="recipes-grid">
      <div v-if="recipes.length === 0 && !loading && !error" style="text-align:center;color:#888;">No recipes found.</div>
      <div class="recipe-card" v-for="recipe in recipes" :key="recipe.id">
        <div class="recipe-image">
          <div class="recipe-placeholder"></div>
        </div>
        <div class="recipe-content">
          <h3>{{ recipe.title }}</h3>
          <p class="recipe-description">{{ recipe.description }}</p>
          <div class="recipe-meta">
            <span class="cook-time">{{ recipe.cookTime || recipe.cook_time || '--' }}</span>
            <span class="difficulty">{{ recipe.difficulty || '--' }}</span>
          </div>
        </div>
      </div>
    </section>

    <div v-if="loading" class="loading-indicator">Loading...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<script>
import { searchRecipes, getRecipeById } from '../services/api';

export default {
  name: 'Recipes',
  data() {
    return {
      searchQuery: '',
      recipes: [],
      loading: false,
      error: '',
    }
  },
  methods: {
    async doSearch() {
      if (!this.searchQuery.trim()) {
        this.recipes = [];
        return;
      }
      this.loading = true;
      this.error = '';
      try {
        const res = await searchRecipes(this.searchQuery);
        this.recipes = Array.isArray(res.recipes) ? res.recipes : (Array.isArray(res.items) ? res.items : []);
      } catch (e) {
        this.error = e.message || 'Search failed';
        this.recipes = [];
      } finally {
        this.loading = false;
      }
    },
    async fetchRecipeById(id) {
      try {
        return await getRecipeById(id);
      } catch (e) {
        return null;
      }
    }
  },
}
</script>

<style scoped>
.recipes {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-header h1 {
  font-size: 2.5rem;
  color: #4caf50;
  margin-bottom: 1rem;
}

.page-header p {
  font-size: 1.1rem;
  color: #666;
  max-width: 600px;
  margin: 0 auto;
}

.search-section {
  margin-bottom: 2rem;
}

.search-container {
  display: flex;
  max-width: 500px;
  margin: 0 auto;
}

.search-input {
  flex: 1;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 25px 0 0 25px;
  font-size: 1rem;
  outline: none;
}

.search-input:focus {
  border-color: #4caf50;
}

.search-button {
  padding: 1rem 1.5rem;
  background: #4caf50;
  border: none;
  border-radius: 0 25px 25px 0;
  color: white;
  cursor: pointer;
  transition: background 0.3s ease;
}

.search-button:hover {
  background: #2e7d32;
}

.search-button svg {
  width: 20px;
  height: 20px;
}

.filters {
  margin-bottom: 3rem;
}

.filter-tags {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.filter-tag {
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.filter-tag:hover {
  background: #e8f5e8;
  color: #4caf50;
}

.filter-tag.active {
  background: #4caf50;
  color: white;
}

.recipes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
}

.recipe-card {
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.recipe-card:hover {
  transform: translateY(-5px);
}

.recipe-image {
  height: 200px;
  background: #f0f0f0;
}

.recipe-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, #e8f5e8, #f0f8f0);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4caf50;
  font-size: 3rem;
}

.recipe-content {
  padding: 1.5rem;
}

.recipe-content h3 {
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
}

.recipe-description {
  color: #666;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.recipe-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
}

.cook-time,
.difficulty {
  color: #4caf50;
  font-weight: 500;
}

.loading-indicator {
  text-align: center;
  font-size: 1.2rem;
  color: #4caf50;
  margin: 2rem 0;
}

.error-message {
  text-align: center;
  color: red;
  margin: 2rem 0;
}

@media (max-width: 768px) {
  .recipes {
    padding: 1rem;
  }

  .page-header h1 {
    font-size: 2rem;
  }

  .recipes-grid {
    grid-template-columns: 1fr;
  }
}
</style>
