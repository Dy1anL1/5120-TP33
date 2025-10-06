# Silver Spoon Society

A comprehensive nutrition and meal planning web application designed specifically for adults aged 55-65, promoting healthy eating habits and supporting senior wellness.

## Features

### Home Dashboard
- Personalized welcome interface
- Quick access to all major features
- Health tips and nutritional guidance

### Recipe Explorer
- Browse over 1,000+ curated healthy recipes
- Advanced filtering by:
  - Dietary preferences (vegetarian, vegan, keto, kosher, etc.)
  - Meal types (breakfast, lunch, dinner, snacks)
  - Allergies and restrictions
- Smart search functionality with auto-suggestions
- Detailed recipe information with ingredients, instructions, and nutrition facts

### Nutrition Dashboard
- Real-time nutrition tracking for calories, protein, calcium, and vitamin D
- Visual progress indicators and goal monitoring
- Personalized daily nutrition recommendations optimized for seniors (55-65+)
- Integration with meal plans for automatic tracking

### Weekly Meal Planning
- Intelligent meal plan generation based on personal preferences
- Comprehensive questionnaire system covering:
  - Dietary preferences and restrictions
  - Allergies and health conditions
  - Cooking skills and meal preferences
  - Caloric needs assessment
- Automated nutrition calculation for planned meals
- Duplicate recipe prevention for variety

### Smart Shopping List
- Automatic generation from meal plans
- Organized by grocery store categories (produce, dairy, meat, etc.)
- Custom item addition with categorization
- Progress tracking and completion status
- Smart shopping tips and optimization

### Seasonal Produce Guide
- Interactive seasonal produce calendar for all Australian states
- Real-time filtering by state (NSW, VIC, QLD, WA, SA, TAS)
- Season-specific produce recommendations (Southern Hemisphere calendar)
- **Intelligent Seasonal Recipe Recommendations** - Smart filtering prioritizes recipes where main ingredients are in season
- Recipe scoring algorithm (main ingredients: 10 points, auxiliary: 1 point)
- Beautiful recipe modal with hero images and tabbed interface
- 2×2 grid layout for better visibility and senior-friendly card size
- Smart search and categorization (fruits vs vegetables)
- Modern, touch-friendly interface optimized for seniors

### Daily Health Recommendations
- Personalized nutrition tips
- Age-appropriate health guidance
- Seasonal eating recommendations
- Wellness best practices for seniors

## Technical Architecture

### Frontend
- **Technology**: Vanilla JavaScript, HTML5, CSS3
- **Design**: Mobile-responsive, senior-friendly interface
- **Features**:
  - Password protection system
  - Local storage for preferences and meal plans
  - Progressive loading with progress indicators
  - Accessible design with large fonts and clear contrast

### Backend
- **Platform**: AWS Serverless Architecture
- **Services**:
  - AWS Lambda functions for recipe and nutrition APIs
  - Amazon DynamoDB for recipe storage
  - API Gateway for REST endpoints
- **Features**:
  - Advanced nutrition calculation with external API integration
  - Intelligent recipe filtering and ranking
  - Duplicate prevention algorithms
  - Fallback estimation systems

### APIs
- **Recipe API**: `https://97xkjqjeuc.execute-api.ap-southeast-2.amazonaws.com/prod/recipes`
- **Nutrition API**: `https://0brixnxwq3.execute-api.ap-southeast-2.amazonaws.com/prod/match`

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for recipe and nutrition data

### Installation
1. Clone the repository
2. Navigate to the `frontend` directory
3. Open `home.html` in your web browser
4. Enter password: `tp33`

### Project Structure
```
├── frontend/
│   ├── home.html              # Main landing page
│   ├── explore-recipes.html   # Recipe browsing interface
│   ├── meal-planning.html     # Meal planning system
│   ├── nutrition-dashboard.html # Nutrition tracking
│   ├── shopping-list.html     # Shopping list generator
│   ├── seasonal-produce.html  # Seasonal produce guide
│   ├── daily-recommendations.html # Health tips
│   ├── styles.css             # Main stylesheet
│   ├── script.js              # Core JavaScript functionality
│   ├── meal-planning.js       # Meal planning logic
│   ├── shopping-list.js       # Shopping list functionality
│   ├── season_food.json       # Seasonal produce data
│   ├── config.js              # Unified configuration
│   └── password-protection.js # Authentication system
├── backend/
│   └── functions/             # AWS Lambda functions
└── data/                      # Recipe datasets
```

## Target Audience

**Primary Users**: Adults aged 55-65 seeking to maintain healthy eating habits

**Key Benefits**:
- Simplified nutrition tracking
- Age-appropriate recipe recommendations
- Senior-friendly interface design
- Comprehensive meal planning assistance
- Health-conscious ingredient selection

## Key Features Implementation

### Nutrition Quality System
- Advanced recipe scoring based on ingredient quality
- Prioritization of recipes with reliable nutrition data
- Automatic filtering of problematic ingredients
- Smart estimation fallbacks for missing data
- 12 core nutrition fields optimized for seniors (55-65+):
  - Calories, Protein, Total Fat, Carbohydrates
  - Dietary Fiber, Total Sugars, Saturated Fats, Trans Fats
  - Vitamin D, Calcium, Iron, Potassium

### Seasonal Produce Features
- Comprehensive database covering all 6 Australian states
- Southern Hemisphere seasonal calendar (accurate for Australia)
- Interactive state and season selection
- Real-time search and filtering functionality
- Senior-friendly large fonts and touch-optimized interface
- Visual categorization of fruits vs vegetables

### Intelligent Meal Planning
- Multi-strategy recipe selection algorithm
- Personalized preference integration
- Variety assurance through duplicate prevention
- Progress tracking with detailed feedback

### Responsive Design
- Mobile-optimized interface
- Large, accessible buttons and text
- High contrast design for better visibility
- Touch-friendly interaction elements

## Browser Compatibility

- Chrome (90+)
- Firefox (88+)
- Safari (14+)
- Edge (90+)

## Security & Privacy

- Client-side password protection
- Local storage for personal data
- No personal information transmitted to servers
- Session-based authentication with automatic timeout

## Recent Improvements

- **Intelligent Seasonal Recipe Recommendations** - Smart algorithm prioritizes recipes with main seasonal ingredients (10-point scoring vs 1-point for auxiliary)
- **Unified Recipe Modal Design** - Beautiful hero image headers with tabbed interface across all pages
- **Improved Recipe Layout** - 2×2 grid for seasonal recipes with larger, more visible cards
- **Unified Navigation** - Consistent navbar order across all pages following user journey flow
- **New Seasonal Produce Guide** - Complete interactive guide for Australian seasonal produce
- **Senior-Optimized Interface** - Large fonts, high contrast, touch-friendly design
- **Nutrition System Enhancement** - 12 core nutrition fields focused on senior health
- **Australian Calendar Integration** - Southern Hemisphere seasonal accuracy
- **Mobile Responsiveness** - Full optimization for all device sizes
- **Performance Improvements** - Faster loading and smoother interactions

## Contributing

This project is designed for senior wellness and healthy eating promotion. Contributions should focus on:
- Accessibility improvements
- Senior-friendly feature enhancements
- Nutrition accuracy and validation
- User experience optimization

## License

This project is developed for educational and wellness purposes, focusing on supporting healthy eating habits for senior adults.

## Support

For technical issues or feature requests, please refer to the `ISSUES.md` file for known issues and planned improvements.

---

**"Supporting healthy eating habits for a better life"**