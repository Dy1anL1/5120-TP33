# Technical Issues & Improvements

## ✅ COMPLETED (Recently Fixed)

### Frontend: API Endpoint Inconsistencies

- **Issue**: Different API endpoints defined in script.js and meal-planning.js
- **Impact**: Configuration conflicts and maintenance issues
- **Fix**: **COMPLETED** - Created unified config.js file
- **Status**: Fixed with unified API_CONFIG system

### Frontend: Modal Design Consistency

- **Issue**: Weekly Meal Plan modal design inconsistent with Explore Healthy Recipes modal
- **Impact**: Inconsistent user experience, smaller images and different nutrition summary layout
- **Fix**: **COMPLETED** - Updated meal-planning modal to match explore-recipes design
- **Status**: Both modals now have consistent image sizing and nutrition card layout

### Backend: Duplicate Recipe Prevention

- **Issue**: Same recipe appearing multiple times in search/filter results
- **Impact**: Poor user experience and limited recipe variety
- **Fix**: **COMPLETED** - Implemented duplicate prevention in both frontend and backend
- **Status**: Added Set-based deduplication in all query handlers and frontend display logic

### Backend: Lambda Timeout Issues

- **Issue**: Functions timing out at 3 seconds causing 500 errors
- **Impact**: Recipe searches and meal plan generation failing
- **Fix**: **COMPLETED** - Fixed const variable assignment errors and improved query logic
- **Status**: Resolved infinite loops and variable assignment errors in DynamoDB scan operations

### Frontend: Nutrition Data Priority System

- **Issue**: Recipes with poor or missing nutrition data being selected equally
- **Impact**: Inconsistent nutrition information in meal plans
- **Fix**: **COMPLETED** - Advanced nutrition quality scoring system already implemented
- **Status**: System prioritizes recipes with better nutrition data quality (top 50% selection)

### Frontend: Modal Container Overflow

- **Issue**: Recipe nutrition info could overflow container boundaries
- **Impact**: Poor user experience on smaller screens
- **Fix**: **COMPLETED** - Improved responsive design and container sizing
- **Status**: Added responsive breakpoints, word wrapping, and increased modal max-width to 1400px

## 🔴 HIGH PRIORITY (Fix Immediately)

### Backend: Recipe Search and Meal Plan Generation Performance

- **Issue**: Recipe search and meal plan generation are extremely slow (5-30 seconds)
- **Impact**: Poor user experience, timeouts, and user abandonment
- **Root Causes**:
  - **DynamoDB Scan Operations**: Using `ScanCommand` instead of `QueryCommand` for all searches
    - Title search scans up to 5,000 items (`MAX_SCAN_ITEMS: 5000`)
    - Category/habit filtering requires full table scan with client-side filtering
    - Multiple round trips with `PAGE_LIMIT: 100` per scan
  - **Missing Database Indexes**: Code comments indicate "GSI is not populated"
    - No Global Secondary Index (GSI) for title search
    - No GSI for categories, habits, or diet types
    - All filtering done on client-side after full scan
  - **Serial API Calls**: Meal plan generation makes sequential API calls
    - Separate recipe API call for each meal type (breakfast, lunch, dinner)
    - Multiple nutrition API calls processed serially
    - No request parallelization or batching
- **Performance Analysis**:
  | Operation | Current Time | Target Time | Improvement Needed |
  |-----------|--------------|-------------|-------------------|
  | Recipe Search | 5-15 seconds | 1-3 seconds | 80%+ reduction |
  | Meal Plan Generation | 15-30 seconds | 5-10 seconds | 65%+ reduction |
- **Proposed Solutions** (Priority Order):
  1. **🔴 Critical - Add DynamoDB GSI Indexes**:
     - `title-index`: Enable efficient title search with QueryCommand
     - `category-index`: Support category filtering via GSI
     - `habits-index`: Support diet type and habit filtering
     - `composite-index`: Enable multi-attribute queries
  2. **🟡 Medium - Frontend Request Optimization**:
     - Implement parallel API calls using `Promise.all()`
     - Add client-side caching with `Map()` or localStorage
     - Implement request debouncing for search inputs
  3. **🟢 Low - Backend API Batching**:
     - Create batch endpoints: `GET /recipes/batch?categories=breakfast,lunch,dinner`
     - Pre-compute popular meal plan combinations
     - Add pagination cursors for large result sets
  4. **🔵 Future - Caching Layer**:
     - CloudFront CDN for static recipe data
     - Redis cache for frequent queries
     - Pre-generated meal plan templates
- **Expected Impact**: 80%+ performance improvement with GSI implementation
- **Priority**: 🔴 Critical (affects core user experience)

### Frontend: Meal Plan Generation User Experience

- **Issue**: Users are blocked from navigating to other pages during meal plan generation
- **Impact**: Poor user experience - users must wait on a loading screen until generation completes
- **Current Behavior**:
  - Meal plan generation locks the UI with a loading spinner
  - Users cannot browse recipes, nutrition dashboard, or other features during generation
  - No notification when generation completes if user navigates away
- **Proposed Solution**:
  - Allow background meal plan generation with free navigation
  - Add notification system (popup + optional sound) when generation completes
  - Show mini progress indicator in navigation bar during generation
  - Provide "Return to Meal Plan" button in completion notification
- **Technical Implementation**:
  - Convert to Web Worker or async background task
  - Add global generation status tracking
  - Implement Browser Notification API or Toast notifications
  - Add Audio API for completion sound (with user preference toggle)
- **Priority**: 🔴 High (significantly improves user experience)

### Frontend: Recipe Ingredient Portion Display

- **Issue**: Multi-serving recipes show ingredient amounts for entire recipe instead of per-person portions
- **Impact**: Users see confusing ingredient quantities that don't match individual serving sizes
- **Current Behavior**:
  - Recipe ingredients list shows total amounts for all servings (e.g., "4 cups rice" for 4-person recipe)
  - Both meal-planning.html and explore-recipes.html display raw ingredient amounts from database
  - Users must manually calculate per-person portions for shopping or cooking
  - Inconsistent with nutrition information which is already shown per-serving
- **Expected Behavior**:
  - Ingredient amounts should be automatically calculated and displayed per person
  - Example: "4 cups rice (serves 4)" should display as "1 cup rice per person"
  - Consistent across both meal planning and recipe exploration interfaces
- **Technical Implementation**:
  - Parse ingredient text to extract quantities (numbers + units)
  - Divide quantities by recipe serving size (recipe.servings || recipe.yield || 4)
  - Handle different quantity formats: "2 cups", "1/2 tablespoon", "3-4 pieces"
  - Preserve non-quantified ingredients: "salt to taste", "fresh herbs"
  - Update ingredient display in both recipe modal and meal planning interfaces
  - Add small note: "Amounts shown per serving" for clarity
- **Code Areas Affected**:
  - `meal-planning.js`: Recipe modal ingredient rendering
  - `explore-recipes.js`: Recipe card and modal ingredient display
  - Both ingredient parsing and display logic
- **Priority**: 🟡 Medium (improves user experience and practical usability)
- **User Benefit**: Easier meal preparation and grocery shopping, especially for single-person cooking

### Frontend: Nutrition Calculation Inconsistencies

- **Issue**: Different nutrition calculation logic between explore-recipes and meal-planning pages
- **Impact**: Users see different nutrition values for the same recipes, many recipes show zero nutrition
- **Root Causes**:
  - **Different Functions**: `script.js` uses `fetchNutrition()` while `meal-planning.js` uses `calculateNutrition()`
  - **Inconsistent Data Processing**: Different handling of API responses and fallback logic
  - **Zero Value Returns**: meal-planning.js returns zeros when API has no data instead of using estimation
  - **Cache Implementation**: Only meal-planning.js has nutrition caching, leading to different performance
- **Current Behavior**:
  - explore-recipes: Shows nutrition when available, handles missing data gracefully
  - meal-planning: Often shows zero nutrition values, less robust error handling
- **Proposed Solution**:
  - Unify nutrition calculation logic into a single shared function
  - Implement consistent fallback strategies across both pages
  - Add better ingredient matching and estimation algorithms
  - Apply consistent caching strategy for both pages
- **Technical Implementation**:
  - Create unified `getNutritionData()` function in shared utility file
  - Implement improved ingredient parsing and matching logic
  - Add consistent error handling and fallback estimation
  - Update both pages to use the same nutrition calculation approach
- **Priority**: 🔴 High (affects core functionality and user trust in nutrition data)

### Backend: Nutrition Calculation Accuracy

- **Issue**: Overly aggressive sodium adjustment logic may cause inaccurate nutrition values
  - Current: `if (n > 10000) n = n / 100` (divides by 100)
  - Current: `if (n > 5000) n = n / 20` (divides by 20)
- **Impact**: Nutrition values may be significantly underestimated
- **Fix**: Use more conservative adjustment thresholds
- **Priority**: 🔴 High (affects nutrition accuracy)

## 🟡 MEDIUM PRIORITY (Important Improvements)

### Frontend: LocalStorage Error Handling

- **Issue**: localStorage operations missing try-catch blocks
- **Impact**: App crashes in privacy mode or when storage quota exceeded
- **Fix**: Create safe localStorage wrapper functions
- **Priority**: 🟡 Medium

### Backend: Performance Optimization

- **Issue**: recipes-api uses table scan operations instead of GSI queries
- **Impact**: Slow response times for large datasets
- **Fix**: Implement GSI queries for title search optimization
- **Priority**: 🟡 Medium

## 🟢 LOW PRIORITY (Nice to Have)

### Backend: Monitoring & Metrics

- **Issue**: No performance monitoring or error tracking
- **Fix**: Add CloudWatch metrics and error monitoring
- **Priority**: 🟢 Low

### Frontend: State Management

- **Issue**: Inconsistent state management across pages
- **Fix**: Implement centralized state management system
- **Priority**: 🟢 Low

### Backend: Caching Layer

- **Issue**: No caching for frequent queries
- **Fix**: Add Redis or DynamoDB DAX caching
- **Priority**: 🟢 Low

### Frontend: Meal Planning Questionnaire Reset

- **Issue**: Users who leave meal planning page and return should have a clean questionnaire experience
- **Impact**: Old form data persists which may confuse users or lead to outdated meal plans
- **Current Behavior**:
  - User preferences are saved in localStorage and persist when returning to meal planning
  - Form inputs remain filled with previous selections
  - Users may not realize they need to review/update their preferences
- **Proposed Solution**:
  - Clear all meal planning form data when users navigate away from meal planning page
  - Reset questionnaire to Step 1 with empty inputs when returning
  - Show welcome message indicating fresh questionnaire start
  - Optionally provide "Load Previous Preferences" button for power users
- **Technical Implementation**:
  - Add beforeunload event listener to clear meal planning localStorage data
  - Reset currentStep to 1 and clear userPreferences object on page entry
  - Update loadUserPreferences() to skip loading for fresh starts
  - Consider adding user preference toggle for this behavior
- **Priority**: 🟢 Low (pending discussion with instructor about user experience approach)
- **User Benefit**: Particularly helpful for elderly users who may be confused by pre-filled forms

---

# Future Enhancements

## Pescatarian Diet Support

- **Feature**: Re-enable Pescatarian diet option when sufficient recipes are available
- **Current Status**: Temporarily disabled due to only 1 recipe in database
- **Implementation**:
  - Add more pescatarian recipes to the database (target: 50+ recipes)
  - Re-enable pescatarian option in frontend filters (explore-recipes.html, meal-planning.js)
  - Add pescatarian back to backend VALID_HABITS array
  - Update recipe tags and categorization for fish-based recipes
- **Benefits**: Better diet diversity and pescatarian user support
- **Priority**: Low (content expansion needed first)

## Allergic Ingredient Filtering

- **Feature**: Add functionality to filter out recipes containing ingredients that users are allergic to
- **Implementation**:
  - Add user allergy preferences to user profile/settings
  - Implement ingredient checking logic in meal planning algorithm
  - Filter recipes during meal plan generation based on allergic ingredients
  - Provide clear indication when recipes are excluded due to allergies
- **Benefits**: Improves user safety and personalization of meal plans
- **Priority**: Medium-High (safety feature)
