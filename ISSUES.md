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

### Frontend: Senior-Friendly Interface Design

- **Issue**: **COMPLETED** - Interface not optimized for elderly users (55-65+ age group)
- **Impact**: Difficulty reading and interacting with small fonts and buttons
- **Fix**: **COMPLETED** - Comprehensive senior-friendly design implementation
- **Status**:
  - **✅ Large Typography**: All text increased 15-25% for better readability
  - **✅ Touch-Optimized Buttons**: Increased button sizes and touch targets
  - **✅ High Contrast**: Improved color contrast throughout interface
  - **✅ Simplified Language**: Reduced complexity in titles and descriptions
  - **✅ Responsive Design**: Optimized for all device sizes with senior considerations

### Frontend: Seasonal Produce Feature

- **Issue**: **COMPLETED** - Missing seasonal produce guidance for Australian users
- **Impact**: Users lack guidance on what produce is fresh and in-season
- **Fix**: **COMPLETED** - Full seasonal produce guide implementation
- **Status**:
  - **✅ Australian Calendar**: Accurate Southern Hemisphere seasonal calendar
  - **✅ State-Specific Data**: Coverage for all 6 Australian states (NSW, VIC, QLD, WA, SA, TAS)
  - **✅ Interactive Interface**: Real-time filtering by state and season
  - **✅ Search Functionality**: Smart search and categorization (fruits vs vegetables)
  - **✅ Senior-Optimized**: Large fonts, clear icons, touch-friendly design
  - **✅ Modern Design**: Contemporary card-based layout with hover effects
  - **✅ Intelligent Recipe Recommendations**: Smart scoring algorithm prioritizes main seasonal ingredients
  - **✅ Word-Boundary Ingredient Matching**: Backend regex prevents false matches (e.g., "apple" won't match "applewood")
  - **✅ Recipe Modal Enhancement**: Hero image headers with tabbed interface for better UX
  - **✅ Optimized Layout**: 2×2 grid for larger, more visible recipe cards

### Frontend: Recipe Modal Redesign

- **Issue**: **COMPLETED** - Inconsistent recipe modal design across different pages
- **Impact**: Poor user experience with different layouts on explore-recipes, meal-planning, and seasonal-produce pages
- **Fix**: **COMPLETED** - Unified recipe modal design with modern interface
- **Status**:
  - **✅ Hero Image Headers**: All modals now feature hero images with gradient overlay and titles
  - **✅ Tabbed Interface**: Consistent tab navigation (Ingredients, Instructions, Nutrition)
  - **✅ Responsive Design**: Modal width increased to 1200px with 90vw for better desktop experience
  - **✅ Seasonal Tags**: Dynamic display of seasonal ingredient tags on seasonal-produce page
  - **✅ Accessibility**: Improved readability and touch-friendly navigation

### Frontend: Navigation Consistency

- **Issue**: **COMPLETED** - Inconsistent navigation order across pages causing user confusion
- **Impact**: Difficult navigation experience as menu items appeared in different orders on different pages
- **Fix**: **COMPLETED** - Unified navigation order following user journey flow
- **Status**:
  - **✅ Consistent Order**: All pages now use: Home → Recipes → Seasonal → Planning → Shopping → Dashboard → Daily Tips
  - **✅ User Flow Logic**: Navigation follows natural progression: browse → discover → plan → shop → track → learn
  - **✅ Unified Icons**: Consistent Font Awesome icons across all navigation items
  - **✅ Home Page Navigation**: Bottom navigation buttons match top navbar order

### Backend: Recipe Query Performance Optimization

- **Issue**: **COMPLETED** - Recipe search was slow (2-3 seconds) due to inefficient DynamoDB operations
- **Impact**: Poor user experience during recipe searches and filtering
- **Fix**: **COMPLETED** - Implemented three-layer optimization strategy for DynamoDB Scan operations
- **Status**:
  - **✅ FilterExpression (DynamoDB-level filtering)**:
    - Pushes category, diet_type, and allergy filtering to DynamoDB layer
    - Reduces network data transfer by ~80%
    - Uses `contains()` on CSV fields for compatibility with array data
  - **✅ Parallel Scanning (4 segments)**:
    - Splits table into 4 concurrent segments
    - Provides 4x speed boost on complex queries
    - Uses `Segment` and `TotalSegments` parameters
  - **✅ Lambda Memory Caching (30-second TTL)**:
    - In-memory Map-based cache with cache key from all filter parameters
    - Maximum 50 entries to prevent memory issues
    - Cache hit performance: 0.12s (83% faster than cold start)
- **Performance Results**:
  - Before: 2-3 seconds average
  - After: 0.12-0.81 seconds average
  - Overall improvement: **3-5x faster**
  - Cache hit: **0.12s** (50% improvement on repeated queries)
- **Decision Rationale**: Chose to optimize Scan instead of switching to Query+GSI because:
  - Small dataset (1,720 recipes) - Scan is fast enough with optimization
  - Array-based data structure (categories, habits) incompatible with GSI partition keys
  - Would require 2-3 days of data migration and restructuring
  - Current optimization achieves target performance without data changes
- **Files Modified**: `backend/functions/recipes-api/lib/queryHandlers.js` (complete rewrite)

### Frontend: Seasonal Produce Load More Feature

- **Issue**: **COMPLETED** - Seasonal produce lists overwhelming with 20+ items displayed at once
- **Impact**: Too much scrolling, reduced readability, poor mobile experience
- **Fix**: **COMPLETED** - Implemented collapsible Load More / Show Less toggle functionality
- **Status**:
  - **✅ Initial Display**: Shows only first 5 items per category (fruits/vegetables)
  - **✅ Toggle Functionality**: Button switches between "Load More" (expand all) and "Show Less" (collapse to 5)
  - **✅ Separate State**: Independent toggle for fruits and vegetables lists
  - **✅ Clean UI**: Better page organization and reduced initial scroll
- **Files Modified**: `frontend/seasonal-produce.html` (lines 640-745)

### Frontend: Dual Recipe Card Heights

- **Issue**: **COMPLETED** - Standard 550px card height insufficient when displaying nutrition information
- **Impact**: Content overflow and cramped layout when Sort By nutrition filter is used
- **Fix**: **COMPLETED** - Implemented two distinct card styles with conditional application
- **Status**:
  - **✅ Normal Card**: 550px height for standard recipe display
  - **✅ Nutrition-Enhanced Card**: 680px height (+130px) for recipes with nutrition data
  - **✅ Conditional Class**: `.recipe-card-with-nutrition` applied based on presence of nutritionData
  - **✅ Consistent Styling**: Maintains visual consistency within each view mode
- **Files Modified**: `frontend/styles.css` (lines 2524-2527)

### Frontend: Loading Animation Enhancement

- **Issue**: **COMPLETED** - Existing "Loading..." text too subtle and easy to miss during 2-3 second searches
- **Impact**: Users unsure if search is processing, poor feedback
- **Fix**: **COMPLETED** - Comprehensive, visually prominent loading animation
- **Status**:
  - **✅ Animated Spinner**: 80px diameter rotating green circle with smooth animation
  - **✅ Pulsing Text**: Large font (1.3rem) with animated dots: "Loading recipes..."
  - **✅ Context Messages**: Stage-specific messages ("Searching through 1,700+ recipes...")
  - **✅ Centered Layout**: Spans all grid columns, flexbox vertical centering
  - **✅ Senior-Friendly**: Large, high-contrast visuals optimized for 55+ users
- **Files Modified**:
  - `frontend/explore-recipes.html` (lines 145-156)
  - `frontend/styles.css` (lines 5910-6050)
  - `frontend/script.js` (lines 1577-1586)

### Frontend: Seasonal Filter Checkbox

- **Issue**: **COMPLETED** - No easy way to filter recipes by seasonal ingredients in Explore Recipes page
- **Impact**: Users had to manually cross-reference between Seasonal Produce and Explore Recipes pages
- **Fix**: **COMPLETED** - Added prominent seasonal filter checkbox with auto-detection
- **Status**:
  - **✅ UI Component**: Large 24x24px checkbox with green accent, leaf icon, gradient background
  - **✅ Auto-Detection**: Detects current season based on Southern Hemisphere calendar (Summer: Dec-Feb, etc.)
  - **✅ Dynamic Hint**: Shows current season in hint text
  - **✅ Ingredient Matching**: Filters recipes by checking ingredients against seasonal produce
  - **✅ Integration**: Works with existing filters (category, diet type, allergies)
  - **✅ Bug Fix**: Fixed 404 error by correcting filename from `seasonal-data.json` to `season_food.json`
- **Files Modified**:
  - `frontend/explore-recipes.html` (lines 145-156)
  - `frontend/styles.css` (lines 5910-6050)
  - `frontend/script.js` (lines 1510-1678)

### Frontend: Meal Type Selection Warning

- **Issue**: **COMPLETED** - Selecting all 8 meal types causes daily calories to exceed recommended intake
- **Impact**: Users unintentionally create unhealthy meal plans with excessive calories
- **Fix**: **COMPLETED** - Added non-blocking warning for excessive meal type selection
- **Status**:
  - **✅ Warning Trigger**: Appears when ≥5 meal types selected
  - **✅ Warning Message**: "Warning: Selecting many meal types may result in daily calories exceeding your recommended intake. Consider selecting 3-4 main meal types (breakfast, lunch, dinner) for balanced nutrition."
  - **✅ Non-Blocking**: Allows user to proceed (warning, not error)
  - **✅ Visual Design**: Yellow background (#fff3cd) distinct from red errors
  - **✅ Health Guidance**: Educates users on appropriate meal type selection
  - **✅ Senior-Friendly**: Clear language, large text, high contrast
- **Files Modified**:
  - `frontend/meal-planning.js` (lines 318-323, 784-846)
  - `frontend/styles.css` (lines 316-320)

## 🔴 HIGH PRIORITY (Fix Immediately)

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

### Frontend: Nutrition System Enhancement
- **Issue**: **PARTIALLY COMPLETED** - Nutrition display and calculation improvements
- **Recent Progress**:
  - **✅ Unified Nutrition Display**: Both explore-recipes and meal-planning now show consistent 12 nutrition fields with icons
  - **✅ Senior-Friendly Interface**: Large fonts, high contrast, touch-optimized nutrition cards
  - **✅ CSS Consistency**: Unified styling between nutrition modals across pages
  - **✅ Core Nutrition Focus**: Simplified to 12 essential nutrients for seniors (removed sodium)
- **Remaining Tasks**:
  - Unify underlying nutrition calculation functions between pages
  - Implement consistent caching strategy for both pages
  - Add better ingredient matching and estimation algorithms
- **Priority**: 🟡 Medium (display layer completed, calculation layer needs unification)

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
