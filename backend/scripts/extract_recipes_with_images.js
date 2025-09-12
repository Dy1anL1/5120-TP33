const fs = require('fs');

console.log("📖 Reading original recipes file...");
// Read from same directory as this script
const rawData = fs.readFileSync(__dirname + "/recipes_images.json", 'utf8');
const allRecipes = JSON.parse(rawData);

console.log(`📊 Total recipes: ${allRecipes.length.toLocaleString()}`);

// Filter recipes that have images
console.log("🔍 Filtering recipes with images...");
const recipesWithImages = allRecipes.filter(recipe => 
  recipe.image_filename && recipe.image_filename !== null
);

console.log(`📸 Recipes with images: ${recipesWithImages.length.toLocaleString()}`);

// Save to current working directory
console.log("💾 Saving to recipes_with_images.json...");
fs.writeFileSync("recipes_with_images.json", JSON.stringify(recipesWithImages, null, 2));

console.log("✅ Done! Created recipes_with_images.json");
console.log(`📈 Filtered: ${recipesWithImages.length}/${allRecipes.length} (${((recipesWithImages.length/allRecipes.length)*100).toFixed(1)}%)`);