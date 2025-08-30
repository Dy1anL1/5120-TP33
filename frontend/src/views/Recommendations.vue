<template>
  <div class="recommendations">
    <section class="page-header">
      <h1>Daily Recommendations</h1>
      <p>Get personalized health tips and meal recommendations every day</p>
    </section>

    <section class="daily-tip">
      <div class="tip-card">
        <div class="tip-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            />
          </svg>
        </div>
        <h2>Today's Health Tip</h2>
        <p class="tip-text">
          Stay hydrated by drinking 8 glasses of water daily. Add lemon or cucumber for flavor!
        </p>
        <span class="tip-date">December 19, 2024</span>
      </div>
    </section>

    <section class="meal-recommendations">
      <h2>Recommended Meals for Today</h2>
      <div class="meals-grid">
        <div class="meal-card" v-for="meal in recommendedMeals" :key="meal.id">
          <div class="meal-time">{{ meal.time }}</div>
          <div class="meal-content">
            <h3>{{ meal.name }}</h3>
            <p>{{ meal.description }}</p>
            <div class="meal-nutrition">
              <span class="calories">{{ meal.calories }} cal</span>
              <span class="protein">{{ meal.protein }}g protein</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="health-insights">
      <h2>Health Insights</h2>
      <div class="insights-grid">
        <div class="insight-card" v-for="insight in healthInsights" :key="insight.id">
          <div class="insight-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              />
            </svg>
          </div>
          <h3>{{ insight.title }}</h3>
          <p>{{ insight.description }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'Recommendations',
  data() {
    return {
      recommendedMeals: [
        {
          id: 1,
          time: 'Breakfast',
          name: 'Oatmeal with Berries',
          description: 'Start your day with fiber-rich oatmeal topped with antioxidant berries',
          calories: 320,
          protein: 12,
        },
        {
          id: 2,
          time: 'Lunch',
          name: 'Grilled Chicken Salad',
          description: 'Lean protein with mixed greens and colorful vegetables',
          calories: 450,
          protein: 35,
        },
        {
          id: 3,
          time: 'Dinner',
          name: 'Baked Salmon',
          description: 'Omega-3 rich fish with steamed vegetables and quinoa',
          calories: 580,
          protein: 42,
        },
      ],
      healthInsights: [
        {
          id: 1,
          title: 'Heart Health',
          description:
            'Your blood pressure readings are within normal range. Keep up the good work!',
        },
        {
          id: 2,
          title: 'Nutrition Balance',
          description: "You're meeting 85% of your daily nutritional needs. Great progress!",
        },
        {
          id: 3,
          title: 'Activity Level',
          description: 'Consider adding 10 more minutes of walking to reach your daily goal.',
        },
      ],
    }
  },
}
</script>

<style scoped>
.recommendations {
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

.daily-tip {
  margin-bottom: 4rem;
}

.tip-card {
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  color: white;
  padding: 3rem;
  border-radius: 20px;
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

.tip-icon {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
}

.tip-icon svg {
  width: 40px;
  height: 40px;
}

.tip-card h2 {
  font-size: 1.8rem;
  margin-bottom: 1rem;
}

.tip-text {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  line-height: 1.6;
}

.tip-date {
  opacity: 0.8;
  font-size: 0.9rem;
}

.meal-recommendations {
  margin-bottom: 4rem;
}

.meal-recommendations h2 {
  text-align: center;
  font-size: 2rem;
  color: #333;
  margin-bottom: 2rem;
}

.meals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
}

.meal-card {
  background: white;
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #4caf50;
}

.meal-time {
  background: #4caf50;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  display: inline-block;
  margin-bottom: 1rem;
  font-weight: 500;
}

.meal-content h3 {
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.3rem;
}

.meal-content p {
  color: #666;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.meal-nutrition {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
}

.calories,
.protein {
  color: #4caf50;
  font-weight: 500;
}

.health-insights h2 {
  text-align: center;
  font-size: 2rem;
  color: #333;
  margin-bottom: 2rem;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.insight-card {
  background: white;
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.insight-icon {
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

.insight-icon svg {
  width: 30px;
  height: 30px;
}

.insight-card h3 {
  color: #333;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.insight-card p {
  color: #666;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .recommendations {
    padding: 1rem;
  }

  .page-header h1 {
    font-size: 2rem;
  }

  .tip-card {
    padding: 2rem;
  }

  .meals-grid,
  .insights-grid {
    grid-template-columns: 1fr;
  }
}
</style>
