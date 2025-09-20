# Technical Issues & Improvements

## 🔴 HIGH PRIORITY (Fix Immediately)

### Frontend: API Endpoint Inconsistency
- **Issue**: Two different nutrition API endpoints used across files
  - `script.js`: `https://0brixnxwq3.execute-api.ap-southeast-2.amazonaws.com/prod/match`
  - `meal-planning.js`: `https://97xkjqjeuc.execute-api.ap-southeast-2.amazonaws.com/prod/nutrition-match`
- **Impact**: One of the nutrition calculation features will fail
- **Fix**: Create shared `config.js` with unified API endpoints
- **Priority**: 🔴 Critical

### Backend: Nutrition Calculation Accuracy
- **Issue**: Overly aggressive sodium adjustment logic may cause inaccurate nutrition values
  - Current: `if (n > 10000) n = n / 100` (divides by 100)
  - Current: `if (n > 5000) n = n / 20` (divides by 20)
- **Impact**: Nutrition values may be significantly underestimated
- **Fix**: Use more conservative adjustment thresholds
- **Priority**: 🔴 High (affects nutrition accuracy)

## 🟡 MEDIUM PRIORITY (Important Improvements)

### Frontend: Missing Error Handling
- **Issue**: Most API calls lack comprehensive error handling
- **Impact**: App crashes or poor UX when APIs fail
- **Fix**: Implement unified error handling wrapper for all API calls
- **Priority**: 🟡 High

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

### Frontend: Code Duplication
- **Issue**: Nutrition calculation logic duplicated between `script.js` and `meal-planning.js`
- **Impact**: Maintenance burden and potential inconsistency
- **Fix**: Extract shared nutrition utilities to common module
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

## Allergic Ingredient Filtering
- **Feature**: Add functionality to filter out recipes containing ingredients that users are allergic to
- **Implementation**:
  - Add user allergy preferences to user profile/settings
  - Implement ingredient checking logic in meal planning algorithm
  - Filter recipes during meal plan generation based on allergic ingredients
  - Provide clear indication when recipes are excluded due to allergies
- **Benefits**: Improves user safety and personalization of meal plans
- **Priority**: Medium-High (safety feature)