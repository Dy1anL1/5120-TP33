const FALLBACK_TIPS = [
  {
    text: "Take a mindful breathing break and stretch your shoulders to refresh your energy.",
    category: "wellness",
    type: "lifestyle",
    diet_ok: ["healthyish"],
    allergy_block: [],
    meal_types: ["any"],
    _fallback: true
  }
];

const DEFAULT_PROFILE = {
  diet_types: ["healthyish"],
  allergies: [],
  meal_preferences: ["breakfast", "lunch", "dinner"],
  user_signature: "guest"
};

const dateKey = () => new Date().toISOString().slice(0, 10);

export async function loadHealthTips() {
  try {
    const response = await fetch("data/health_tips.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data)) return data;
    console.warn("[health-tips] Unexpected JSON structure, falling back to empty array.");
    return [];
  } catch (error) {
    console.error("[health-tips] Failed to load health tips:", error);
    return FALLBACK_TIPS;
  }
}

export function getUserProfile() {
  const storageKey =
    (window.API_CONFIG && window.API_CONFIG.STORAGE_KEYS && window.API_CONFIG.STORAGE_KEYS.MEAL_PLAN_PREFERENCES) ||
    "mealPlanPreferences";
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    const dietTypes = Array.isArray(parsed.diet_types) && parsed.diet_types.length ? parsed.diet_types : DEFAULT_PROFILE.diet_types;
    const allergies = Array.isArray(parsed.allergies) ? parsed.allergies : DEFAULT_PROFILE.allergies;
    const mealPreferences = Array.isArray(parsed.meal_preferences) && parsed.meal_preferences.length
      ? parsed.meal_preferences
      : DEFAULT_PROFILE.meal_preferences;

    return {
      ...parsed,
      diet_types: dietTypes.map(toKey),
      allergies: allergies.map(toKey),
      meal_preferences: mealPreferences.map(toKey),
      user_signature: parsed.user_id || parsed.email || parsed.phone || "guest"
    };
  } catch (error) {
    console.warn("[health-tips] Unable to parse stored profile, using defaults.", error);
    return { ...DEFAULT_PROFILE };
  }
}

export function filterTips(tips, profile) {
  if (!Array.isArray(tips)) return [];
  const diets = (profile.diet_types && profile.diet_types.length ? profile.diet_types : DEFAULT_PROFILE.diet_types).map(toKey);
  const allergies = new Set((profile.allergies || []).map(toKey));
  const mealPrefs = (profile.meal_preferences && profile.meal_preferences.length
    ? profile.meal_preferences
    : DEFAULT_PROFILE.meal_preferences).map(toKey);

  return tips.filter(tip => {
    const dietOk = Array.isArray(tip.diet_ok) && tip.diet_ok.length ? tip.diet_ok.map(toKey) : DEFAULT_PROFILE.diet_types;
    if (!dietOk.some(d => diets.includes(d))) return false;

    const blocks = Array.isArray(tip.allergy_block) ? tip.allergy_block.map(toKey) : [];
    if (blocks.some(b => allergies.has(b))) return false;

    const mealTargets = Array.isArray(tip.meal_types) && tip.meal_types.length ? tip.meal_types.map(toKey) : ["any"];
    if (!mealTargets.includes("any") && !mealTargets.some(m => mealPrefs.includes(m))) return false;

    return true;
  });
}

export function pickDailyTips(tips, desiredCount = 3, profile = {}) {
  if (!Array.isArray(tips) || tips.length === 0) return [];
  const uniqueSeed = `${dateKey()}|${profile.user_signature || profile.user_id || "guest"}`;
  const seed = hashString(uniqueSeed);

  const shuffled = shuffleWithSeed(tips, seed);
  const nutrition = shuffled.filter(t => t.type === "nutrition");
  const lifestyle = shuffled.filter(t => t.type !== "nutrition");

  const availableCount = shuffled.length >= 3 ? Math.min(desiredCount, shuffled.length) : Math.min(2, shuffled.length);
  const selection = [];

  if (nutrition.length > 0) {
    selection.push(nutrition.shift());
  }

  const pool = [...nutrition, ...lifestyle];
  for (const tip of pool) {
    if (selection.length >= availableCount) break;
    if (!selection.includes(tip)) selection.push(tip);
  }

  return selection.slice(0, availableCount);
}

export function renderTips(tips, container, options = {}) {
  if (!container) return;
  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "tips-wrapper";

  const headingWrap = document.createElement("div");
  headingWrap.className = "tips-heading";
  const title = document.createElement("h2");
  title.className = "section-title";
  title.textContent = options.title || "Personalized Daily Tips";
  headingWrap.appendChild(title);
  if (options.subtitle) {
    const subtitle = document.createElement("p");
    subtitle.className = "section-subtitle";
    subtitle.textContent = options.subtitle;
    headingWrap.appendChild(subtitle);
  }

  wrapper.appendChild(headingWrap);

  const note = options.note;
  if (note) {
    const noteEl = document.createElement("p");
    noteEl.className = "tips-note";
    noteEl.textContent = note;
    wrapper.appendChild(noteEl);
  }

  if (!tips || tips.length === 0) {
    const empty = document.createElement("p");
    empty.className = "tips-empty";
    empty.textContent = "No tips available right now. Please check back later.";
    wrapper.appendChild(empty);
    container.appendChild(wrapper);
    return;
  }

  const list = document.createElement("div");
  list.className = "tips-grid";

  tips.forEach((tip, index) => {
    const card = document.createElement("article");
    card.className = "tip-card";
    card.setAttribute("data-tip-index", String(index));
    card.setAttribute("aria-label", `${capitalize(tip.category || "tip")} recommendation`);

    const badge = document.createElement("span");
    badge.className = "tip-category";
    badge.textContent = capitalize(tip.category || "general");
    badge.title = capitalize(tip.type || "tip");

    const icon = document.createElement("span");
    icon.className = "tip-icon";
    icon.textContent = tip.type === "nutrition" ? "🥦" : "🌤";
    icon.setAttribute("aria-hidden", "true");

    const header = document.createElement("div");
    header.className = "tip-header";
    header.append(icon, badge);

    const textWrapper = document.createElement("div");
    textWrapper.className = "tip-text";
    const fullText = tip.text || "Stay healthy and keep moving!";
    const isLong = fullText.length > 180;
    textWrapper.textContent = isLong ? `${fullText.slice(0, 180)}…` : fullText;
    textWrapper.dataset.fullText = fullText;
    textWrapper.dataset.collapsed = String(isLong);

    card.append(header, textWrapper);

    if (isLong) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "tip-toggle";
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = "Read more";
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        if (expanded) {
          textWrapper.textContent = `${fullText.slice(0, 180)}…`;
          toggle.textContent = "Read more";
        } else {
          textWrapper.textContent = fullText;
          toggle.textContent = "Show less";
        }
        toggle.setAttribute("aria-expanded", String(!expanded));
      });
      card.appendChild(toggle);
    }

    list.appendChild(card);
  });

  wrapper.appendChild(list);
  container.appendChild(wrapper);
}

/* ----------------------------- helpers ----------------------------- */

function toKey(value) {
  return String(value || "").toLowerCase().trim();
}

function capitalize(value) {
  const str = String(value || "");
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed(items, seed) {
  const arr = [...items];
  const random = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
