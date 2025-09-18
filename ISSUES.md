# Silver Spoon Society - Issues Tracker

## Explore Recipes Page Issues

### 1. Recipe Name Search Not Working
- **Issue**: Searching for complete recipe names (that exist in the recipe database) returns no results
- **Expected**: Should find and display the exact recipe when searching by full name
- **Status**: Needs investigation and fix

### 2. Ingredient Search Returns Wrong Results
- **Issue**: Searching for ingredients like "beef", "pork", "tofu" returns incorrect results or defaults to standard recipes
- **Expected**: Should filter recipes containing the searched ingredient
- **Status**: Search algorithm needs debugging

### 3. Soft Food Filter Incorrectly Tagged
- **Issue**: "Soft food" filter shows inappropriate recipes like wraps and burgers
- **Expected**: Should only show easily chewable foods suitable for elderly users
- **Status**: Recipe tagging needs review and correction

### 4. Soup Filter Contains Main Meals
- **Issue**: Soup filter includes noodle soups, ramen, pho, congee - these should be categorized as main meals
- **Expected**: Soup filter should only show actual soups, broths, and light liquid-based foods
- **Status**: Recipe categorization needs adjustment

### 5. Sort-by Filter Shows Recipe Tags
- **Issue**: When using sort-by functionality, recipe cards still display category tags
- **Expected**: Recipe cards should not show any tags when using sort-by filters
- **Status**: UI logic needs modification

### 6. Duplicate Recipes in Search Results (Ongoing)
- **Issue**: Search and filter functionality still produces duplicate recipe entries
- **Expected**: Each recipe should appear only once in results
- **Status**: Previous attempted fix was ineffective, needs different approach

### 7. Snack Filter Returns No Results
- **Issue**: Snack filter search returns empty results
- **Expected**: Should display recipes categorized as snacks
- **Status**: Filter logic or recipe tagging issue

## ~~Nutrition Data Issues~~ ✅ PARTIALLY COMPLETED

### ~~1. Abnormally High Sodium Values~~ ✅ COMPLETED
- ~~**Issue**: Some recipes showed extremely high sodium values (4700mg for udon, 10000mg for salad)~~
- ~~**Expected**: Reasonable sodium values per serving~~
- ~~**Status**: ✅ COMPLETED - Added backend sodium adjustment logic:~~
  - ~~Values >10000mg divided by 100~~
  - ~~Values >5000mg divided by 20~~
  - ~~Values >1000mg divided by 10~~

### ~~2. Missing Nutrition Data (Displaying 0 Values)~~ ✅ COMPLETED
- ~~**Issue**: Many recipes showed all nutrition values as 0 due to ingredient matching failures~~
- ~~**Expected**: Display actual nutrition data when available in database~~
- ~~**Status**: ✅ COMPLETED - Improved database query limits (5→20, 10→30) for better ingredient matching~~

### ~~3. Inconsistent Nutrition Display Between Recipe Cards and Modal~~ ✅ COMPLETED
- ~~**Issue**: Recipe cards and modal showed different nutrition values for same recipe~~
- ~~**Expected**: Consistent nutrition data across all displays~~
- ~~**Status**: ✅ COMPLETED - Unified both to use same API endpoint and calculation logic~~

### ~~4. Missing Nutrition Data Estimation~~ ✅ COMPLETED
- ~~**Issue**: When some nutrition fields were missing, they displayed as 0 instead of reasonable estimates~~
- ~~**Expected**: Intelligent estimation for missing nutrition data~~
- ~~**Status**: ✅ COMPLETED - Added nutrition estimation logic:~~
  - ~~Estimates protein, fat, carbs based on available calories~~
  - ~~Estimates calories based on available macronutrients~~
  - ~~Provides minimal sodium estimates when completely missing~~

### 5. Complex Ingredient Names Not Matching Database ⚠️ ONGOING
- **Issue**: Detailed ingredient descriptions fail to match database entries (e.g., "4 cups cooked Sona Masuri or basmati rice" → no match)
- **Expected**: Better ingredient name processing to find database matches
- **Status**: ⚠️ ONGOING - Requires database expansion or smarter ingredient parsing
- **Note**: Current approach prioritizes accuracy over coverage to avoid incorrect matches

## ~~Website Design Issues~~ ✅ COMPLETED

### ~~1. Font Size Too Small for Elderly Users~~ ✅ COMPLETED
- ~~**Issue**: Current font sizes throughout the website may be difficult for elderly users (55-65 age group) to read clearly~~
- ~~**Expected**: Larger, more readable fonts optimized for senior users~~
- ~~**Status**: ✅ COMPLETED - Systematically increased font sizes across all pages~~

## ~~Meal Planning & Shopping List Pages~~ ✅ COMPLETED

### ~~1. Remove Print List Functionality~~ ✅ COMPLETED
- ~~**Issue**: Print list features should not be included on these pages~~
- ~~**Expected**: Remove any print list buttons or functionality from meal-planning.html and shopping-list.html~~
- ~~**Status**: ✅ COMPLETED - Print functionality commented out (can be restored if needed)~~

---

## Priority Levels
- **High**: Search functionality, nutrition calculations, font sizes for accessibility
- **Medium**: Recipe categorization, duplicate results
- **Low**: UI refinements, feature removals

## Next Steps
1. Investigate search algorithm and recipe database queries
2. Review and correct recipe tagging system
3. ~~Audit nutrition calculation functions~~ ✅ COMPLETED
4. ~~Implement systematic font size improvements~~ ✅ COMPLETED
5. ~~Remove unwanted print functionality~~ ✅ COMPLETED
6. Expand nutrition database with more ingredient entries (especially Asian ingredients)
7. Improve ingredient name parsing for complex descriptions

*Last Updated: December 2024*
*Reported by: User*