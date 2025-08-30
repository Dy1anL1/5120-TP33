import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Recipes from '../views/Recipes.vue'
import Recommendations from '../views/Recommendations.vue'
import MealPlanner from '../views/MealPlanner.vue'
import ShoppingList from '../views/ShoppingList.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/recipes',
    name: 'Recipes',
    component: Recipes,
  },
  {
    path: '/recommendations',
    name: 'Recommendations',
    component: Recommendations,
  },
  {
    path: '/meal-planner',
    name: 'MealPlanner',
    component: MealPlanner,
  },
  {
    path: '/shopping-list',
    name: 'ShoppingList',
    component: ShoppingList,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
