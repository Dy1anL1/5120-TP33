<template>
  <div class="meal-planner">
    <section class="page-header">
      <h1>Meal Planner</h1>
      <p>Create weekly meal plans based on your dietary preferences and health goals</p>
    </section>

    <section class="planner-controls">
      <div class="week-selector">
        <button class="week-nav-btn" @click="previousWeek">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        <h2>{{ currentWeekDisplay }}</h2>
        <button class="week-nav-btn" @click="nextWeek">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>
      </div>
      <button class="add-meal-btn">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
        Add Meal
      </button>
    </section>

    <section class="weekly-calendar">
      <div class="calendar-header">
        <div class="day-header" v-for="day in weekDays" :key="day.name">
          <h3>{{ day.name }}</h3>
          <span class="date">{{ day.date }}</span>
        </div>
      </div>

      <div class="calendar-body">
        <div class="meal-slot" v-for="(day, dayIndex) in weekDays" :key="day.name">
          <div class="meal-times">
            <div class="meal-time" v-for="mealTime in mealTimes" :key="mealTime.name">
              <h4>{{ mealTime.name }}</h4>
              <div class="meal-item" v-if="getMeal(dayIndex, mealTime.name)">
                <div class="meal-info">
                  <h5>{{ getMeal(dayIndex, mealTime.name).name }}</h5>
                  <p>{{ getMeal(dayIndex, mealTime.name).description }}</p>
                </div>
                <button class="remove-meal-btn" @click="removeMeal(dayIndex, mealTime.name)">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                    />
                  </svg>
                </button>
              </div>
              <div class="empty-meal" v-else @click="addMeal(dayIndex, mealTime.name)">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                <span>Add Meal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="nutrition-summary">
      <h2>Weekly Nutrition Summary</h2>
      <div class="nutrition-grid">
        <div class="nutrition-card" v-for="nutrient in nutritionSummary" :key="nutrient.name">
          <div class="nutrient-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              />
            </svg>
          </div>
          <h3>{{ nutrient.name }}</h3>
          <p class="nutrient-value">{{ nutrient.value }}</p>
          <p class="nutrient-goal">Goal: {{ nutrient.goal }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'MealPlanner',
  data() {
    return {
      currentWeek: 0,
      weekDays: [
        { name: 'Monday', date: 'Dec 16' },
        { name: 'Tuesday', date: 'Dec 17' },
        { name: 'Wednesday', date: 'Dec 18' },
        { name: 'Thursday', date: 'Dec 19' },
        { name: 'Friday', date: 'Dec 20' },
        { name: 'Saturday', date: 'Dec 21' },
        { name: 'Sunday', date: 'Dec 22' },
      ],
      mealTimes: [{ name: 'Breakfast' }, { name: 'Lunch' }, { name: 'Dinner' }, { name: 'Snack' }],
      meals: [
        // Monday
        [
          { name: 'Oatmeal with Berries', description: 'Fiber-rich breakfast' },
          { name: 'Grilled Chicken Salad', description: 'Lean protein lunch' },
          { name: 'Baked Salmon', description: 'Omega-3 rich dinner' },
          null,
        ],
        // Tuesday
        [
          { name: 'Greek Yogurt Parfait', description: 'Protein-packed breakfast' },
          null,
          { name: 'Vegetable Stir-Fry', description: 'Colorful veggie dinner' },
          { name: 'Mixed Nuts', description: 'Healthy snack' },
        ],
        // Wednesday
        [
          null,
          { name: 'Quinoa Bowl', description: 'Nutritious lunch' },
          { name: 'Grilled Turkey', description: 'Lean protein dinner' },
          null,
        ],
        // Thursday
        [
          { name: 'Smoothie Bowl', description: 'Fruit-filled breakfast' },
          { name: 'Mediterranean Salad', description: 'Fresh lunch' },
          null,
          { name: 'Apple with Peanut Butter', description: 'Satisfying snack' },
        ],
        // Friday
        [
          null,
          { name: 'Soup and Sandwich', description: 'Comforting lunch' },
          { name: 'Fish Tacos', description: 'Light dinner' },
          null,
        ],
        // Saturday
        [
          { name: 'Pancakes', description: 'Weekend breakfast' },
          null,
          { name: 'Pasta Primavera', description: 'Italian dinner' },
          { name: 'Dark Chocolate', description: 'Sweet treat' },
        ],
        // Sunday
        [
          { name: 'Eggs Benedict', description: 'Brunch favorite' },
          { name: 'Roast Chicken', description: 'Sunday dinner' },
          null,
          null,
        ],
      ],
      nutritionSummary: [
        { name: 'Calories', value: '1,850', goal: '2,000' },
        { name: 'Protein', value: '85g', goal: '90g' },
        { name: 'Fiber', value: '28g', goal: '30g' },
        { name: 'Sodium', value: '1,200mg', goal: '1,500mg' },
      ],
    }
  },
  computed: {
    currentWeekDisplay() {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + this.currentWeek * 7)
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)

      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    },
  },
  methods: {
    previousWeek() {
      this.currentWeek--
    },
    nextWeek() {
      this.currentWeek++
    },
    getMeal(dayIndex, mealTime) {
      const mealIndex = this.mealTimes.findIndex((time) => time.name === mealTime)
      return this.meals[dayIndex] ? this.meals[dayIndex][mealIndex] : null
    },
    addMeal(dayIndex, mealTime) {
      // This would open a meal selection modal in a real app
      console.log(`Adding meal for ${this.weekDays[dayIndex].name} ${mealTime}`)
    },
    removeMeal(dayIndex, mealTime) {
      const mealIndex = this.mealTimes.findIndex((time) => time.name === mealTime)
      if (this.meals[dayIndex]) {
        this.$set(this.meals[dayIndex], mealIndex, null)
      }
    },
  },
}
</script>

<style scoped>
.meal-planner {
  max-width: 1400px;
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

.planner-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.week-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.week-nav-btn {
  background: #4caf50;
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s ease;
}

.week-nav-btn:hover {
  background: #2e7d32;
}

.week-nav-btn svg {
  width: 20px;
  height: 20px;
}

.week-selector h2 {
  color: #333;
  font-size: 1.5rem;
  min-width: 200px;
  text-align: center;
}

.add-meal-btn {
  background: #4caf50;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  transition: background 0.3s ease;
}

.add-meal-btn:hover {
  background: #2e7d32;
}

.add-meal-btn svg {
  width: 20px;
  height: 20px;
}

.weekly-calendar {
  background: white;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 3rem;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #4caf50;
  color: white;
}

.day-header {
  padding: 1rem;
  text-align: center;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
}

.day-header:last-child {
  border-right: none;
}

.day-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.date {
  font-size: 0.9rem;
  opacity: 0.9;
}

.calendar-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.meal-slot {
  border-right: 1px solid #e0e0e0;
}

.meal-slot:last-child {
  border-right: none;
}

.meal-times {
  display: flex;
  flex-direction: column;
}

.meal-time {
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
  min-height: 120px;
}

.meal-time:last-child {
  border-bottom: none;
}

.meal-time h4 {
  color: #4caf50;
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.meal-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 0.75rem;
  position: relative;
}

.meal-info h5 {
  margin: 0 0 0.25rem 0;
  font-size: 0.9rem;
  color: #333;
}

.meal-info p {
  margin: 0;
  font-size: 0.8rem;
  color: #666;
  line-height: 1.3;
}

.remove-meal-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: #ff6b6b;
  border: none;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-meal-btn svg {
  width: 12px;
  height: 12px;
}

.empty-meal {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60px;
  color: #ccc;
  cursor: pointer;
  border: 2px dashed #e0e0e0;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.empty-meal:hover {
  border-color: #4caf50;
  color: #4caf50;
}

.empty-meal svg {
  width: 20px;
  height: 20px;
  margin-bottom: 0.25rem;
}

.empty-meal span {
  font-size: 0.8rem;
}

.nutrition-summary {
  margin-bottom: 2rem;
}

.nutrition-summary h2 {
  text-align: center;
  font-size: 2rem;
  color: #333;
  margin-bottom: 2rem;
}

.nutrition-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.nutrition-card {
  background: white;
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.nutrient-icon {
  width: 60px;
  height: 60px;
  background: #e8f5e8;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  color: #4caf50;
}

.nutrient-icon svg {
  width: 30px;
  height: 30px;
}

.nutrition-card h3 {
  color: #333;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.nutrient-value {
  font-size: 2rem;
  font-weight: bold;
  color: #4caf50;
  margin-bottom: 0.5rem;
}

.nutrient-goal {
  color: #666;
  font-size: 0.9rem;
}

@media (max-width: 1200px) {
  .calendar-header,
  .calendar-body {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }

  .meal-slot {
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }

  .meal-slot:last-child {
    border-bottom: none;
  }
}

@media (max-width: 768px) {
  .meal-planner {
    padding: 1rem;
  }

  .page-header h1 {
    font-size: 2rem;
  }

  .planner-controls {
    flex-direction: column;
    gap: 1rem;
  }

  .nutrition-grid {
    grid-template-columns: 1fr;
  }
}
</style>
