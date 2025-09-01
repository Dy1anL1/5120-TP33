import fs from "fs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import csv from "csv-parser";

// --- Strict Tagging Helpers ---
const W = (s) => (s || '').toLowerCase();
const hasWord = (hay, w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i').test(hay);
const anyWord = (hay, words) => words.some(w => hasWord(hay, w));
const notAnyWord = (hay, words) => !anyWord(hay, words);
function normalizeArray(a) {
  if (Array.isArray(a)) return a.map(x => String(x));
  if (typeof a === 'string') {
    try { const v = JSON.parse(a); return Array.isArray(v) ? v.map(String) : [a]; } catch { return a.split('|').map(s=>s.trim()); }
  }
  return [];
}
function joinTexts(title, ingredients, directions) {
  const t = W(title);
  const ing = normalizeArray(ingredients).join(' ').toLowerCase();
  const dir = normalizeArray(directions).join(' ').toLowerCase();
  return `${t} ${ing} ${dir}`.slice(0, 8000);
}

function deriveCategoriesStrict(title, ingredients, directions) {
  const text = joinTexts(title, ingredients, directions);
  const tl = W(title);

  const isSoup = (
    anyWord(tl, ['soup','broth','bisque','chowder','gumbo','consommé']) ||
    (anyWord(normalizeArray(ingredients).join(' ').toLowerCase(), ['broth','stock']) && notAnyWord(tl, ['smoothie','juice','tea','coffee']))
  );
  const isSalad = anyWord(tl, ['salad']);
  const isDessert = (
    anyWord(tl, ['dessert','pudding','brownie','cheesecake','cupcake','mousse','tart','pie','cookie','cake','ice cream']) &&
    notAnyWord(tl, ['chicken','beef','pork','shrimp','fish','burger','steak'])
  );
  const isDrink = (
    anyWord(tl, ['smoothie','milkshake','shake','juice','tea','coffee','latte','mocha','lemonade','punch','cocktail']) &&
    notAnyWord(tl, ['soup','broth','stock'])
  );
  const isBreakfast = anyWord(tl, ['breakfast','omelet','omelette','oatmeal','granola','pancake','waffle','scramble','muffin','toast']);
  const isLunch = anyWord(tl, ['sandwich','burger','wrap','burrito']);
  const isDinner = anyWord(tl, ['stew','roast','casserole','pasta','noodles','stir-fry','stir fry','bake'])
                 || (!isBreakfast && !isDrink && !isDessert && !isSoup && !isSalad);

  const cats = new Set();
  if (isSoup) cats.add('soup');
  if (isSalad) cats.add('salad');
  if (isDessert) cats.add('dessert');
  if (isDrink) cats.add('drink');
  if (isBreakfast) cats.add('breakfast');
  if (isLunch) cats.add('lunch');
  if (isDinner) cats.add('dinner');

  // conflict cleanup
  if (cats.has('drink')) { cats.delete('lunch'); cats.delete('dinner'); }
  if (cats.has('dessert')) { cats.delete('dinner'); }

  const order = ['soup','salad','dessert','drink','breakfast','lunch','dinner'];
  return order.filter(c => cats.has(c)).slice(0, 3);
}

function deriveHabitsStrict(title, ingredients) {
  const text = joinTexts(title, ingredients, []);
  const meat = ['beef','pork','bacon','ham','veal','lamb','mutton','sausage','gelatin'];
  const poultry = ['chicken','turkey','duck'];
  const seafood = ['fish','salmon','tuna','shrimp','prawn','crab','lobster','anchovy','sardine'];
  const dairy = ['milk','butter','cheese','cream','yogurt','yoghurt','ghee','whey'];
  const eggs = ['egg','eggs'];
  const gluten = ['wheat','flour','breadcrumbs','panko','barley','rye','malt','semolina','spaghetti','pasta','noodle'];
  const nuts = ['peanut','almond','walnut','pecan','hazelnut','cashew','pistachio','macadamia'];
  const sugars = ['sugar','brown sugar','caster sugar','powdered sugar','icing sugar','honey','syrup','molasses'];

  const tags = new Set();
  const hasMeat = anyWord(text, meat);
  const hasPoultry = anyWord(text, poultry);
  const hasSeafood = anyWord(text, seafood);
  const hasDairy = anyWord(text, dairy);
  const hasEggs = anyWord(text, eggs);

  // vegetarian: allow eggs/dairy, but no meat/poultry/seafood
  if (!hasMeat && !hasPoultry && !hasSeafood) tags.add('vegetarian');

  // vegan: no meat/poultry/seafood + no eggs/dairy + no honey
  if (!hasMeat && !hasPoultry && !hasSeafood && !hasDairy && !hasEggs && !hasWord(text, 'honey')) {
    tags.add('vegan');
  }

  // gluten_free: either explicit "gluten-free" or no common gluten words
  if (hasWord(text, 'gluten-free') || notAnyWord(text, gluten)) tags.add('gluten_free');

  if (notAnyWord(text, dairy)) tags.add('dairy_free');
  if (notAnyWord(text, nuts)) tags.add('nut_free');
  if (hasWord(text, 'unsweetened') || notAnyWord(text, sugars)) tags.add('low_sugar');

  return Array.from(tags);
}
// --- End Strict Tagging Helpers ---

const REGION = "ap-southeast-2";
const TABLE = "Recipes_i1";
const MAX_ITEMS = 5000; // You can change this to between 2000-10000

const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

async function batchWriteAll(items, table) {
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    const params = {
      RequestItems: {
        [table]: batch.map((item) => ({ PutRequest: { Item: item } })),
      },
    };
    try {
      await ddb.send(new BatchWriteCommand(params));
      console.log(`Wrote items ${i + 1} - ${i + batch.length} successfully`);
    } catch (err) {
      console.error("Batch write error", err);
    }
  }
}

async function main() {
  const items = [];
  let count = 0;

  await new Promise((resolve, reject) => {
    fs.createReadStream("full_dataset.csv")
      .pipe(csv())
      .on("data", (row) => {
        if (count >= MAX_ITEMS) return;
        if (!row.title || !row.recipe_id) return;

        // --- Strict Tagging and Normalization ---
        const title = (row.title || '').trim();
        const ingredients = normalizeArray(row.ingredients);
        const directions  = normalizeArray(row.directions);

        const title_lc = title.toLowerCase();
        const item = {
          recipe_id: row.recipe_id,
          title,
          title_lc,
          title_lc_first1: title_lc[0],
          ingredients,
          directions,
          habits: [], // will be overwritten
          categories: [], // will be overwritten
          habits_csv: '', // will be overwritten
          categories_csv: '', // will be overwritten
          ingredients_text: ingredients.join(' ').toLowerCase().slice(0, 4000),
        };
        item.categories = deriveCategoriesStrict(title, ingredients, directions);
        item.habits = deriveHabitsStrict(title, ingredients);
        item.categories_csv = item.categories.join(',');
        item.habits_csv = item.habits.join(',');

        items.push(item);
        count++;
      })
      .on("end", resolve)
      .on("error", reject);
  });

  console.log(`Preparing to write ${items.length} items to DynamoDB`);
  await batchWriteAll(items, TABLE);
  console.log("All done");
}

main().catch((err) => {
  console.error("Script execution error", err);
  process.exit(1);
});