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
