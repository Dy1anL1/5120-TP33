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
  const ingText = normalizeArray(ingredients).join(' ').toLowerCase();

  // Strict mutually exclusive category priority: soup > salad > dessert > breakfast > lunch > dinner
  if (anyWord(tl, ['soup','broth','bisque','chowder','gumbo','consommé']) ||
      (anyWord(ingText, ['broth','stock']) && notAnyWord(tl, ['smoothie','juice','tea','coffee']))) {
    return ['soup'];
  }
  if (anyWord(tl, ['salad'])) {
    return ['salad'];
  }
  if (anyWord(tl, ['dessert','pudding','brownie','cheesecake','cupcake','mousse','tart','pie','cookie','cake','ice cream']) &&
      notAnyWord(tl, ['chicken','beef','pork','shrimp','fish','burger','steak'])) {
    return ['dessert'];
  }
  if (anyWord(tl, ['breakfast','omelet','omelette','oatmeal','granola','pancake','waffle','scramble','muffin','toast'])) {
    return ['breakfast'];
  }
  if (anyWord(tl, ['sandwich','burger','wrap','burrito'])) {
    return ['lunch'];
  }
  if (anyWord(tl, ['stew','roast','casserole','pasta','noodles','stir-fry','stir fry','bake'])) {
    return ['dinner'];
  }
  // Default to dinner
  return ['dinner'];
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
const MAX_ITEMS = 10000; // total number

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
  const allRows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream("full_dataset.csv")
      .pipe(csv())
      .on("data", (row) => {
        if (!row.title || !row.recipe_id) return;
        allRows.push(row);
      })
      .on("end", resolve)
      .on("error", reject);
  });

  // 1. For each main ingredient, collect 10 recipes
  const mainIngredients = [
    { key: 'fish', words: ['fish','salmon','tuna','cod','trout','anchovy','sardine','mackerel'] },
    { key: 'duck', words: ['duck'] },
    { key: 'lamb', words: ['lamb','mutton'] },
    { key: 'chicken', words: ['chicken'] },
    { key: 'beef', words: ['beef','steak','brisket','ox','veal'] },
    { key: 'pork', words: ['pork','bacon','ham','sausage'] },
    { key: 'shrimp', words: ['shrimp','prawn'] },
    { key: 'crab', words: ['crab'] },
    { key: 'egg', words: ['egg','eggs'] },
    { key: 'tofu', words: ['tofu','bean curd'] },
    { key: 'cake', words: ['cake'] },
    { key: 'brownie', words: ['brownie'] },
    { key: 'pie', words: ['pie'] },
    { key: 'cookie', words: ['cookie'] },
    { key: 'soup', words: ['soup','broth','bisque','chowder','consommé','gumbo'] },
  ];
  const pickedIds = new Set();
  const pickedTitles = new Set();
  const picked = [];
  for (const ing of mainIngredients) {
    let found = 0;
    for (const row of allRows) {
      if (found >= 10) break;
      const title = (row.title || '').trim();
      const title_lc = title.toLowerCase();
      if (pickedTitles.has(title_lc)) continue;
      const ingredients = normalizeArray(row.ingredients);
      const directions = normalizeArray(row.directions);
      const text = `${title_lc} ${ingredients.join(' ').toLowerCase()} ${directions.join(' ').toLowerCase()}`;
      if (ing.words.some(w => text.includes(w))) {
        // For soup, strictly exclude salad, smoothie, etc.
        if (ing.key === 'soup' && /salad|smoothie|juice|tea|coffee/.test(text)) continue;
        // cake, brownie and other dessert types should exclude main dish keywords
        if ((ing.key === 'cake' || ing.key === 'brownie') && /chicken|beef|pork|fish|shrimp|lamb|duck|burger|steak/.test(text)) continue;
        // Remove duplicates by name
        pickedIds.add(row.recipe_id);
        pickedTitles.add(title_lc);
        picked.push(row);
        found++;
      }
    }
  }

  // 2. Randomly fill up to 10000, remove duplicate names
  const shuffled = allRows.sort(() => Math.random() - 0.5);
  for (const row of shuffled) {
    if (picked.length >= MAX_ITEMS) break;
    const title = (row.title || '').trim();
    const title_lc = title.toLowerCase();
    if (pickedTitles.has(title_lc)) continue;
    if (pickedIds.has(row.recipe_id)) continue;
    pickedIds.add(row.recipe_id);
    pickedTitles.add(title_lc);
    picked.push(row);
  }

  // 3. Generate final items
  const items = [];
  for (const row of picked.slice(0, MAX_ITEMS)) {
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
  }

  console.log(`Preparing to write ${items.length} items to DynamoDB`);
  await batchWriteAll(items, TABLE);
  console.log("All done");
}

main().catch((err) => {
  console.error("Script execution error", err);
  process.exit(1);
});