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

## Nutrition Data Issues

### 1. Incorrect Nutrition Calculations
- **Issue**: Nutrition data calculations appear to be significantly different from expected normal values
- **Expected**: Nutrition values should accurately reflect standard nutritional information
- **Status**: Needs comprehensive review of calculation logic and data sources

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
3. Audit nutrition calculation functions
4. Implement systematic font size improvements
5. Remove unwanted print functionality

*Last Updated: [Current Date]*
*Reported by: User*