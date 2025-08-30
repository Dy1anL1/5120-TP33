<template>
  <div class="shopping-list">
    <section class="page-header">
      <h1>Shopping List</h1>
      <p>Generate organized shopping lists from your meal plans and track your ingredients</p>
    </section>

    <section class="list-controls">
      <div class="search-container">
        <input
          type="text"
          placeholder="Add item to list..."
          class="add-item-input"
          v-model="newItem"
          @keyup.enter="addItem"
        />
        <button class="add-item-btn" @click="addItem">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>
      </div>
      <div class="list-actions">
        <button class="action-btn" @click="generateFromMealPlan">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
            />
          </svg>
          Generate from Meal Plan
        </button>
        <button class="action-btn" @click="clearCompleted">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
          Clear Completed
        </button>
      </div>
    </section>

    <section class="shopping-categories">
      <div class="category-section" v-for="category in shoppingCategories" :key="category.name">
        <h2 class="category-title">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
          {{ category.name }}
        </h2>
        <div class="category-items">
          <div
            class="shopping-item"
            v-for="item in category.items"
            :key="item.id"
            :class="{ completed: item.completed }"
          >
            <div class="item-checkbox">
              <input
                type="checkbox"
                :id="'item-' + item.id"
                v-model="item.completed"
                @change="updateItemStatus(item)"
              />
              <label :for="'item-' + item.id"></label>
            </div>
            <div class="item-content">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-quantity" v-if="item.quantity">{{ item.quantity }}</span>
            </div>
            <div class="item-actions">
              <button class="edit-btn" @click="editItem(item)">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                  />
                </svg>
              </button>
              <button class="delete-btn" @click="deleteItem(item)">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="list-summary">
      <div class="summary-card">
        <h3>List Summary</h3>
        <div class="summary-stats">
          <div class="stat">
            <span class="stat-number">{{ totalItems }}</span>
            <span class="stat-label">Total Items</span>
          </div>
          <div class="stat">
            <span class="stat-number">{{ completedItems }}</span>
            <span class="stat-label">Completed</span>
          </div>
          <div class="stat">
            <span class="stat-number">{{ remainingItems }}</span>
            <span class="stat-label">Remaining</span>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: completionPercentage + '%' }"></div>
        </div>
        <p class="completion-text">{{ completionPercentage }}% Complete</p>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'ShoppingList',
  data() {
    return {
      newItem: '',
      shoppingCategories: [
        {
          name: 'Produce',
          items: [
            { id: 1, name: 'Bananas', quantity: '6 pieces', completed: false },
            { id: 2, name: 'Spinach', quantity: '1 bag', completed: true },
            { id: 3, name: 'Tomatoes', quantity: '4 pieces', completed: false },
            { id: 4, name: 'Carrots', quantity: '1 lb', completed: false },
          ],
        },
        {
          name: 'Dairy & Eggs',
          items: [
            { id: 5, name: 'Greek Yogurt', quantity: '2 containers', completed: false },
            { id: 6, name: 'Eggs', quantity: '1 dozen', completed: true },
            { id: 7, name: 'Milk', quantity: '1 gallon', completed: false },
          ],
        },
        {
          name: 'Meat & Seafood',
          items: [
            { id: 8, name: 'Chicken Breast', quantity: '2 lbs', completed: false },
            { id: 9, name: 'Salmon Fillets', quantity: '1 lb', completed: false },
          ],
        },
        {
          name: 'Pantry',
          items: [
            { id: 10, name: 'Quinoa', quantity: '1 bag', completed: true },
            { id: 11, name: 'Olive Oil', quantity: '1 bottle', completed: false },
            { id: 12, name: 'Honey', quantity: '1 jar', completed: false },
          ],
        },
      ],
    }
  },
  computed: {
    totalItems() {
      return this.shoppingCategories.reduce((total, category) => {
        return total + category.items.length
      }, 0)
    },
    completedItems() {
      return this.shoppingCategories.reduce((total, category) => {
        return total + category.items.filter((item) => item.completed).length
      }, 0)
    },
    remainingItems() {
      return this.totalItems - this.completedItems
    },
    completionPercentage() {
      if (this.totalItems === 0) return 0
      return Math.round((this.completedItems / this.totalItems) * 100)
    },
  },
  methods: {
    addItem() {
      if (this.newItem.trim()) {
        // Add to first category (Produce) by default
        const newItemObj = {
          id: Date.now(),
          name: this.newItem.trim(),
          quantity: '',
          completed: false,
        }
        this.shoppingCategories[0].items.push(newItemObj)
        this.newItem = ''
      }
    },
    updateItemStatus(item) {
      // This would typically update the backend
      console.log(`Item ${item.name} status updated to ${item.completed}`)
    },
    editItem(item) {
      // This would open an edit modal in a real app
      console.log(`Editing item: ${item.name}`)
    },
    deleteItem(item) {
      // Remove item from all categories
      this.shoppingCategories.forEach((category) => {
        const index = category.items.findIndex((i) => i.id === item.id)
        if (index > -1) {
          category.items.splice(index, 1)
        }
      })
    },
    generateFromMealPlan() {
      // This would generate items from the meal planner
      console.log('Generating shopping list from meal plan...')
    },
    clearCompleted() {
      // Remove all completed items
      this.shoppingCategories.forEach((category) => {
        category.items = category.items.filter((item) => !item.completed)
      })
    },
  },
}
</script>

<style scoped>
.shopping-list {
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

.list-controls {
  margin-bottom: 3rem;
}

.search-container {
  display: flex;
  max-width: 500px;
  margin: 0 auto 2rem;
}

.add-item-input {
  flex: 1;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 25px 0 0 25px;
  font-size: 1rem;
  outline: none;
}

.add-item-input:focus {
  border-color: #4caf50;
}

.add-item-btn {
  padding: 1rem 1.5rem;
  background: #4caf50;
  border: none;
  border-radius: 0 25px 25px 0;
  color: white;
  cursor: pointer;
  transition: background 0.3s ease;
}

.add-item-btn:hover {
  background: #2e7d32;
}

.add-item-btn svg {
  width: 20px;
  height: 20px;
}

.list-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  background: #f5f5f5;
  color: #333;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: #e8f5e8;
  color: #4caf50;
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

.shopping-categories {
  margin-bottom: 3rem;
}

.category-section {
  margin-bottom: 2rem;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #333;
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.category-title svg {
  width: 24px;
  height: 24px;
  color: #4caf50;
}

.category-items {
  background: white;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.shopping-item {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.3s ease;
}

.shopping-item:last-child {
  border-bottom: none;
}

.shopping-item:hover {
  background: #f8f9fa;
}

.shopping-item.completed {
  opacity: 0.6;
}

.shopping-item.completed .item-name {
  text-decoration: line-through;
  color: #999;
}

.item-checkbox {
  margin-right: 1rem;
}

.item-checkbox input[type='checkbox'] {
  display: none;
}

.item-checkbox label {
  display: block;
  width: 20px;
  height: 20px;
  border: 2px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
}

.item-checkbox input[type='checkbox']:checked + label {
  background: #4caf50;
  border-color: #4caf50;
}

.item-checkbox input[type='checkbox']:checked + label::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.item-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-name {
  font-weight: 500;
  color: #333;
}

.item-quantity {
  background: #e8f5e8;
  color: #4caf50;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.9rem;
  font-weight: 500;
}

.item-actions {
  display: flex;
  gap: 0.5rem;
}

.edit-btn,
.delete-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-btn {
  color: #4caf50;
}

.edit-btn:hover {
  background: #e8f5e8;
}

.delete-btn {
  color: #ff6b6b;
}

.delete-btn:hover {
  background: #ffe8e8;
}

.edit-btn svg,
.delete-btn svg {
  width: 18px;
  height: 18px;
}

.list-summary {
  text-align: center;
}

.summary-card {
  background: white;
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  margin: 0 auto;
}

.summary-card h3 {
  color: #333;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-bottom: 2rem;
}

.stat {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #4caf50;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: #f0f0f0;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #2e7d32);
  transition: width 0.3s ease;
}

.completion-text {
  color: #4caf50;
  font-weight: 500;
  margin: 0;
}

@media (max-width: 768px) {
  .shopping-list {
    padding: 1rem;
  }

  .page-header h1 {
    font-size: 2rem;
  }

  .list-actions {
    flex-direction: column;
    align-items: center;
  }

  .summary-stats {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .item-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
