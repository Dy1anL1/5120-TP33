# Silver Spoon Society

Silver Spoon Society is a holistic nutrition and wellness companion tailored for adults aged 55–65. The application blends healthy recipe discovery, personalized meal planning, smart shopping, and daily health guidance in a single, senior-friendly experience.

## Table of Contents
1. [Key Features](#key-features)  
2. [Architecture Overview](#architecture-overview)  
3. [Getting Started](#getting-started)  
4. [Project Structure](#project-structure)  
5. [Personalization & Data Flow](#personalization--data-flow)  
6. [Recent Enhancements](#recent-enhancements)  
7. [Contributing Guidelines](#contributing-guidelines)  
8. [License](#license)  
9. [Support](#support)

## Key Features

### Home Hub
- Warm welcome panel with quick navigation to every major module.
- Rotating health reminders curated for senior lifestyles.

### Recipe Explorer
- 1,000+ curated recipes with detailed nutrition and instructions.
- Advanced filtering by diet, allergies, meal type, and seasonal availability.
- Ranked search with adaptive suggestion prompts.

### Nutrition Dashboard
- Real-time tracking of calories, macronutrients, and senior-critical micronutrients.
- Visual goal progress aligned with Australian/New Zealand NRV guidelines.
- Automatic synchronization with meal plans and dashboard saves.

### Weekly Meal Planning
- Questionnaire-driven plan generator capturing diet, allergies, activity level, and meal preferences.
- Intelligent de-duplication, nutrition validation, and multi-day summaries.
- Export to shopping list and dashboard with per-serving nutrition preserved.

### Shopping List Assistant
- Aggregates plan ingredients by grocery category for easy trips.
- Allows manual items, completion tracking, and smart tips.

### Seasonal Produce Guide
- State-specific (AU) seasonal data with dynamic filtering.
- Highlights recipes aligned with in-season ingredients.
- Accessible card layout with large imagery and typography.

### Daily Health Recommendations
- Personalized tip engine drawing from curated tip data sets.
- Filters tips by diet type, allergies, meal preferences, and rotates suggestions daily.
- “Refresh tips” control for same-day variety with guaranteed general advice.

## Architecture Overview

### Frontend
- Vanilla JavaScript, HTML5, CSS3—no frameworks for maximum compatibility.
- Accessibility and senior-friendly design principles (large touch targets, high contrast, readable typography).
- Modules for shared config (`frontend/config.js`), plan logic (`frontend/meal-planning.js`), and tip personalization (`frontend/health-tips.js`).

### Backend (AWS Serverless)
- **recipes-api** – DynamoDB-backed recipe search and filter endpoints.
- **nutrition-match-api** – Ingredient parsing, density-aware conversions, synonym normalization, and per-serving calculations.
- **foods-api** – Food database lookups and nutrition metadata.
- Deployed via Lambda + API Gateway; data stored in DynamoDB tables (`Recipes`, `Foods_v2`).

## Getting Started

### Prerequisites
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+).
- Network access for live recipe/nutrition APIs.

### Quick Start
1. Clone the repository.  
2. Open `frontend/home.html` in a browser (local file or static host).  
3. Enter the demo password `tp33` when prompted.  
4. Explore additional modules (Meal Planning, Seasonal Produce, Daily Tips, etc.).

### Local Development Notes
- Personalization data stores in `localStorage` under keys managed by `API_CONFIG.STORAGE_KEYS`.  
- `frontend/data/` contains JSON data assets used across pages (e.g., seasonal produce, health tips).  
- For backend development, refer to `backend/README.md` for Lambda deployment and scripts.

## Project Structure

```
frontend/
  data/
    health_tips.json       # Curated tip repository (diet, allergy, meal-type metadata)
    season_food.json       # Australian seasonal produce dataset
  scripts/
    (see backend/scripts for server utilities)
  *.html                   # Page templates (home, recipes, meal planning, tips, etc.)
  styles.css               # Shared styling
  script.js                # Core UI behaviours (navigation, widgets)
  meal-planning.js         # Questionnaire, plan generation, nutrition sync
  health-tips.js           # Daily tip filtering, selection, rendering
backend/
  functions/               # Lambda services (recipes, foods, nutrition match)
  scripts/                 # Data loaders / maintenance helpers
  README.md                # Backend setup instructions
```

## Personalization & Data Flow
1. **Questionnaire Inputs** → stored in `localStorage` (`mealPlanPreferences`).  
2. **Meal Planning** → fetches recipes via `recipes-api`, calculates nutrition through `nutrition-match-api`, updates dashboard and shopping list.  
3. **Daily Tips** → loads `data/health_tips.json`, filters by diet/allergies/meal preferences, uses date + refresh counter for stable randomness, and renders accessible cards.  
4. **Dashboard Export** → cached meal plans saved under `weeklyMealPlanForDashboard` for cross-page availability.

## Recent Enhancements
- **Daily Tip Refresh**: new “refresh tips” control with smart seeding, ensures one general tip and a nutrition-focused recommendation each cycle.
- **Data Consolidation**: all front-end JSON assets relocated to `frontend/data/` for clarity; module fetch paths updated accordingly.
- **Tip Styling Upgrade**: redesigned “Personalized Daily Tips” cards with higher contrast, accessible buttons, and larger typography.
- **Per-Serving Alignment**: entire stack (meal planner, modal, dashboard) uses consistent per-serving nutrition, preventing double-counting.
- **Backend Matching Improvements**: density-aware conversions, synonym normalization, allergy guards, and nutrient alias consolidation reduce false matches and outliers.

## Contributing Guidelines
We welcome contributions that improve accessibility, senior friendliness, nutrition accuracy, or user experience. Before submitting a change:
1. Open an issue describing the enhancement or bug fix.  
2. Follow existing code style (vanilla JS, semantic HTML, descriptive CSS classes).  
3. Provide manual testing notes (e.g., browsers used, questionnaire scenarios).  
4. Ensure no sensitive credentials or PII appear in commits.

## License
This project is provided for educational and wellness support purposes. Commercial reuse requires explicit permission from the project owners.

## Support
For questions, issues, or feature requests, use the repository issue tracker or consult `ISSUES.md` for common tasks and roadmap items.

---  
**Supporting healthy eating habits for a better life.**
