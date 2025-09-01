// src/services/api.js

const RECIPES = import.meta.env.VITE_RECIPES_BASE;
const FOODS   = import.meta.env.VITE_FOODS_BASE;
const NUTR    = import.meta.env.VITE_NUTRITION_BASE;

async function httpJson(url, opts = {}) {
  const r = await fetch(url, opts);
  if (!r.ok) {
    let text = "";
    try { text = await r.text(); } catch {}
    throw new Error(`HTTP ${r.status} ${r.statusText} - ${text}`);
  }
  return r.json();
}

// ---------- Recipes ----------
export async function getRecipeById(id) {
  const u = new URL(`${RECIPES}/recipes`);
  u.searchParams.set("recipe_id", String(id));
  return httpJson(u);
}

/**
 * Search recipes (supports habit / category / pagination)
 * @param {string} prefix Title prefix
 * @param {{limit?:number,nextToken?:string,habit?:string,category?:string}} opts
 */
export async function searchRecipes(prefix, opts = {}) {
  const { limit = 10, nextToken, habit, category } = opts;
  const u = new URL(`${RECIPES}/recipes`);
  u.searchParams.set("title_prefix", prefix.trim());
  u.searchParams.set("limit", String(limit));
  if (nextToken) u.searchParams.set("next_token", nextToken);
  if (habit)     u.searchParams.set("habit", habit);
  if (category)  u.searchParams.set("category", category);
  return httpJson(u);
}

// ---------- Foods ----------
export async function getFoodById(id) {
  const u = new URL(`${FOODS}/foods`);
  u.searchParams.set("id", String(id));
  return httpJson(u);
}

export async function searchFoods(prefix, opts = {}) {
  const { limit = 10, nextToken } = opts;
  const u = new URL(`${FOODS}/foods`);
  u.searchParams.set("name_prefix", prefix.trim());
  u.searchParams.set("limit", String(limit));
  if (nextToken) u.searchParams.set("next_token", nextToken);
  return httpJson(u);
}

// ---------- Nutrition (match) ----------
export async function matchNutrition(ingredients) {
  return httpJson(`${NUTR}/match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ingredients })
  });
}
