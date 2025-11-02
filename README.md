# Silver Spoon Society

Silver Spoon Society is a holistic nutrition and wellness companion tailored for adults aged 55-65. The application blends healthy recipe discovery, personalized meal planning, smart shopping, and daily health guidance in a single, senior-friendly experience.

Website: https://silver-spoon-society.live/

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
- Responsive grid that auto-fits cards across desktop breakpoints (1920 -> 1366) while preserving typography.
- Inline loading feedback for both new searches and "Load more" pagination for a smoother browsing flow.

### Nutrition Dashboard

- Real-time tracking of calories, macronutrients, and senior-critical micronutrients.
- Visual goal progress aligned with Australian/New Zealand NRV guidelines.
- Automatic synchronization with meal plans and dashboard saves.

### Weekly Meal Planning

- Questionnaire-driven plan generator capturing diet, allergies, activity level, and meal preferences.
- Intelligent de-duplication, nutrition validation, and multi-day summaries.
- Export to shopping list and dashboard with per-serving nutrition preserved.
- Refined recipe card layout with consistent gutters, tighter typography, and improved hover containment for medium-width desktops.

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
- "Refresh tips" control for same-day variety with guaranteed general advice.

## Architecture Overview

### Frontend

- Vanilla JavaScript, HTML5, CSS3-no frameworks for maximum compatibility.
- Accessibility and senior-friendly design principles (large touch targets, high contrast, readable typography).
- Modules for shared config (`frontend/config.js`), plan logic (`frontend/meal-planning.js`), and tip personalization (`frontend/health-tips.js`).

### Backend (AWS Serverless)

- **recipes-api** - DynamoDB-backed recipe search and filter endpoints.
- **nutrition-match-api** - Ingredient parsing, density-aware conversions, synonym normalization, and per-serving calculations.
- **foods-api** - Food database lookups and nutrition metadata.
- Deployed via Lambda + API Gateway; data stored in DynamoDB tables (`Recipes_i2`, `Foods_v2`).
- Region: `ap-southeast-2` (Sydney, Australia)

### Database

- **AWS DynamoDB** (NoSQL database)
  - `Foods_v2` table: 10,000+ food items with nutritional data
  - `Recipes_i2` table: 1,000+ curated recipes with dietary tags
  - Both tables include Global Secondary Indexes (GSI) for fast prefix searches
  - See [backend/DATA_IMPORT_GUIDE.md](backend/DATA_IMPORT_GUIDE.md) for data import instructions

## Getting Started

### Prerequisites

- Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+).
- Network access for live recipe/nutrition APIs.

### Quick Start

1. Clone the repository.
2. Open `frontend/index.html` in a browser (local file or static host).
3. Enter the demo password `tp33` when prompted.
4. Explore additional modules (Meal Planning, Seasonal Produce, Daily Tips, etc.).

### Live Demo

Visit the deployed application at: [Silver Spoon Society](https://silverspoon-tp33.netlify.app)

### Local Development Notes

- Personalization data stores in `localStorage` under keys managed by `API_CONFIG.STORAGE_KEYS`.
- `frontend/data/` contains JSON data assets used across pages (e.g., seasonal produce, health tips).
- For backend development, refer to `backend/README.md` for Lambda deployment and scripts.

## Project Structure

```
frontend/
  data/
    health_tips.json           # Curated tip repository (diet, allergy, meal-type metadata)
    season_food.json           # Australian seasonal produce dataset
  *.html                       # Page templates
    index.html                 # Landing page / Home hub
    explore-recipes.html       # Recipe browser with filters
    meal-planning.html         # Weekly meal planner
    nutrition-dashboard.html   # Nutrition tracking
    shopping-list.html         # Smart shopping list
    seasonal-produce.html      # Seasonal ingredient guide
    daily-recommendations.html # Personalized health tips
  *.js                         # JavaScript modules
    config.js                  # API endpoints and shared configuration
    script.js                  # Core UI behaviors (navigation, modals)
    meal-planning.js           # Meal plan generation and nutrition sync
    health-tips.js             # Daily tip filtering and rendering
    shopping-list.js           # Shopping list management
    password-protection.js     # Demo access control
  styles.css                   # Unified styling across all pages
backend/
  functions/
    recipes-api/               # Recipe search, filtering, meal planning
    nutrition-match-api/       # Ingredient parsing and nutrition calculation
    foods-api/                 # Food database queries
  scripts/
    upload-foods.js            # Import foods CSV to DynamoDB
    load_json.js               # Import recipes JSON to DynamoDB
    check-nutrition-table.js   # Verify table structure
    clear-nutrition-table.js   # Clear table data
  README.md                    # Backend API documentation
  DATA_IMPORT_GUIDE.md         # Data import instructions
dataset/
  convert_health_tips.py       # Health tips data processing
  convert_season_food.py       # Seasonal produce data processing
  nutrition intake recommandation.xlsx  # NRV reference data
netlify-deploy/
  (Production-ready static files for Netlify deployment)
```

## Personalization & Data Flow

1. **Questionnaire Inputs** -> stored in `localStorage` (`mealPlanPreferences`).
2. **Meal Planning** -> fetches recipes via `recipes-api`, calculates nutrition through `nutrition-match-api`, updates dashboard and shopping list.
3. **Daily Tips** -> loads `data/health_tips.json`, filters by diet/allergies/meal preferences, uses date + refresh counter for stable randomness, and renders accessible cards.
4. **Dashboard Export** -> cached meal plans saved under `weeklyMealPlanForDashboard` for cross-page availability.

## Recent Enhancements

### Frontend Improvements
- **Mobile Responsive Design**: Fixed display size and menu button functionality for mobile devices
- **Navigation Enhancement**: Combined index.html with home.html, fixed navbar order
- **Daily Tip Refresh**: New "refresh tips" control with smart seeding, ensures one general tip and nutrition-focused recommendation
- **Recipe Explorer Polish**: Auto-fit recipe grid, inline loaders for search and pagination
- **Data Consolidation**: All JSON assets relocated to `frontend/data/` for better organization

### Backend Improvements
- **Modular Architecture**: Refactored recipes-api with config/ and lib/ modules for better maintainability
- **Nutrition Matching**: Density-aware conversions, synonym normalization, and allergy guards
- **Per-Serving Alignment**: Consistent per-serving nutrition across meal planner, modals, and dashboard
- **Data Import Tools**: Comprehensive scripts for uploading foods and recipes to DynamoDB
- **Filter Enhancements**: Added soft_food validation and improved filtering logic

### Documentation
- **Backend README**: Updated with detailed API endpoints and database schema
- **Data Import Guide**: New guide for importing data into DynamoDB tables
- **Deployment Guide**: Netlify deployment instructions in `netlify-deploy/DEPLOY.md`

## Contributing Guidelines

We welcome contributions that improve accessibility, senior friendliness, nutrition accuracy, or user experience. Before submitting a change:

1. Open an issue describing the enhancement or bug fix.
2. Follow existing code style (vanilla JS, semantic HTML, descriptive CSS classes).
3. Provide manual testing notes (e.g., browsers used, questionnaire scenarios).
4. Ensure no sensitive credentials or PII appear in commits.

## License

This project is provided for educational and wellness support purposes. Commercial reuse requires explicit permission from the project owners.

## Documentation

- **[backend/README.md](backend/README.md)** - Backend API documentation and deployment instructions
- **[backend/DATA_IMPORT_GUIDE.md](backend/DATA_IMPORT_GUIDE.md)** - Database import guide for foods and recipes
- **[netlify-deploy/DEPLOY.md](netlify-deploy/DEPLOY.md)** - Frontend deployment guide for Netlify
- **[ISSUES.md](ISSUES.md)** - Common tasks and project roadmap

## Support

For questions, issues, or feature requests:
1. Check documentation files listed above
2. Use the repository issue tracker
3. Review AWS CloudWatch logs for backend issues
4. Consult the data import guide for database setup

---

**Supporting healthy eating habits for a better life.**

**Demo Password**: `tp33`
