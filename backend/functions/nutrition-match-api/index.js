// Basic unit conversion table (fallbacks when no ingredient-specific rule applies)
const UNIT_TO_GRAM = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  oz: 28.35,
  pound: 453.6,
  lb: 453.6,
  ml: 1,      // Will be refined by density map when possible
  l: 1000,    // Will be refined by density map when possible
  // Basic volumetric conversions (will be overridden by ingredient-specific)
  cup: 240,    // Default for liquids
  cups: 240,
  tbsp: 15,    // Default tablespoon
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,      // Default teaspoon
  teaspoon: 5,
  teaspoons: 5,
  // Size conversions
  large: 50,   // large egg
  medium: 118, // medium banana/apple average
  small: 114,  // small avocado
  slice: 30,   // bread slice
  clove: 3,    // garlic clove
  cloves: 3,
  bunch: 340,  // spinach bunch
  can: 411,    // diced tomatoes can
  pinch: 0.36, // ~ 1/16 tsp salt
  dash: 0.6,   // ~ 1/8 tsp
  sprig: 2,    // small herb sprig rough avg
  handful: 30, // rough avg
};

// Ingredient-specific conversions (based on OpenNutrition data and common references)
const INGREDIENT_CONVERSIONS = {
  // Flour family
  'flour': { cup: 125, tbsp: 8 },
  'all-purpose flour': { cup: 125, tbsp: 8 },
  'wheat flour': { cup: 125, tbsp: 8 },

  // Dairy
  'milk': { cup: 240, tbsp: 15 },
  'butter': { tbsp: 14, cup: 227, stick: 113, sticks: 113 },
  'cheese': { cup: 113 },
  'cheddar cheese': { cup: 113 },
  'shredded cheese': { cup: 113 },

  // Vegetables
  'onion': { cup: 160 },
  'chopped onion': { cup: 160 },
  'diced onion': { cup: 160 },
  'garlic': { clove: 3, tbsp: 15 },
  'minced garlic': { tbsp: 15 },
  'spinach': { bunch: 340 },

  // Grains
  'rice': { cup: 185 },
  'cooked rice': { cup: 185 },
  'white rice': { cup: 185 },

  // Oils and fats
  'olive oil': { tbsp: 14, tsp: 5 },
  'oil': { tbsp: 14, tsp: 5 },
  'vegetable oil': { tbsp: 14, tsp: 5 },
  'canola oil': { tbsp: 14, tsp: 5 },
  'coconut oil': { tbsp: 13, tsp: 4.5 },

  // Fruits
  'banana': { medium: 118 },
  'apple': { medium: 182 },
  'avocado': { small: 114, medium: 136 },

  // Proteins
  'egg': { large: 50, medium: 44 },
  'chicken breast': { oz: 28.35, piece: 174, pieces: 174, breast: 174, breasts: 174 },

  // Canned goods
  'diced tomatoes': { can: 411 },
  'tomatoes': { can: 411 },

  // Bread
  'bread': { slice: 30 },

  // Sugars & baking
  'granulated sugar': { cup: 200, tbsp: 12.5 },
  'brown sugar': { cup: 220, tbsp: 13.75 },
  'powdered sugar': { cup: 120, tbsp: 7.5 },
  'confectioners sugar': { cup: 120, tbsp: 7.5 },
  'icing sugar': { cup: 120, tbsp: 7.5 },

  // Condiments
  'soy sauce': { tbsp: 18, tsp: 6 },
  'honey': { tbsp: 21, tsp: 7 },
  'vinegar': { tbsp: 15, tsp: 5 },
};

// Densities for common liquids (g/ml)
const DENSITY_BY_KEY = {
  'water': 1.0,
  'milk': 1.03,
  'soy sauce': 1.16,
  'oil': 0.91,
  'olive oil': 0.91,
  'vegetable oil': 0.91,
  'canola oil': 0.92,
  'honey': 1.42,
  'vinegar': 1.01,
  'broth': 1.02,
  'stock': 1.02,
  'yogurt': 1.03
};

// Smart conversion function that considers ingredient type
function convertToGrams(amount, unit, ingredientName) {
  // Normalize ingredient name for lookup
  const normalizedName = ingredientName.toLowerCase().trim();

  // Check for ingredient-specific conversions first
  for (const [key, conversions] of Object.entries(INGREDIENT_CONVERSIONS)) {
    if (normalizedName.includes(key)) {
      if (conversions[unit]) {
        console.log(`Using ingredient-specific conversion for ${ingredientName}: ${amount} ${unit} = ${amount * conversions[unit]}g`);
        return amount * conversions[unit];
      }
    }
  }

  // Volumetric ml/L → grams using density when possible
  if (unit === 'ml' || unit === 'l') {
    const ml = unit === 'l' ? amount * 1000 : amount;
    for (const key of Object.keys(DENSITY_BY_KEY)) {
      if (normalizedName.includes(key)) {
        const gram = ml * DENSITY_BY_KEY[key];
        console.log(`Using density(${key}) for ${ingredientName}: ${ml} ml => ${gram} g`);
        return gram;
      }
    }
    // default 1 g/ml
    console.log(`Using default density for ${ingredientName}: ${ml} ml => ${ml} g`);
    return ml;
  }

  // Fallback to general conversion table
  const gramValue = UNIT_TO_GRAM[unit] || 1;
  let gram = amount * gramValue;

  // Heuristic: if unit is plain 'g' (likely missing) and amount is a small integer count,
  // try to interpret as a whole-piece for certain foods (use 'medium' or 'piece' weights if available)
  if (unit === 'g' && Number.isFinite(amount) && amount > 0 && amount <= 10) {
    for (const [key, conversions] of Object.entries(INGREDIENT_CONVERSIONS)) {
      if (normalizedName.includes(key)) {
        const pieceWeight = conversions.piece || conversions.medium || conversions.small;
        if (pieceWeight) {
          const guessed = amount * pieceWeight;
          console.log(`Assuming piece count for ${ingredientName}: ${amount} x ${pieceWeight}g = ${guessed}g`);
          gram = guessed;
          break;
        }
      }
    }
  }
  console.log(`Using general conversion for ${ingredientName}: ${amount} ${unit} = ${gram}g`);
  return gram;
}

function parseAmountUnit(str) {
  // Normalize unicode fractions and approximate/range tokens
  let s = String(str || '').trim()
    .replace(/[~≈]/g, '')
    .replace(/about|approx\.?|around|nearly/gi, '')
    .replace(/¼/g, '1/4')
    .replace(/½/g, '1/2')
    .replace(/¾/g, '3/4');

  // Handle ranges like "2-3" or "2 to 3" ⇒ take average
  s = s.replace(/(\d+(?:\.\d+)?)[\s-]+(?:to\s+)?(\d+(?:\.\d+)?)/i, (m, a, b) => {
    const avg = (Number(a) + Number(b)) / 2;
    return String(avg);
  });

  // Parse like "1.5 tbsp sugar" or "1 1/2 cups milk"
  const re = /(\d+(?:\s+\d\/\d|\.\d+|\/\d+)?)[\s-]*(kg|g|gram|grams|oz|lb|lbs|pound|pounds|ml|l|cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|large|medium|small|slice|slices|clove|cloves|bunch|can|pinch|dash|sprig|handful|piece|pieces|breast|breasts|stick|sticks)?\s*(.*)/i;
  const m = s.match(re);
  // If we cannot parse, default to 0 g to avoid phantom calories
  if (!m) return { amount: 0, unit: 'g', name: s };

  // Mixed number like "1 1/2"
  let amountStr = m[1].trim();
  let amount = 0;
  if (/\s+/.test(amountStr)) {
    const [a, b] = amountStr.split(/\s+/, 2);
    amount = Number(a) + (b.includes('/') ? (Number(b.split('/')[0]) / Number(b.split('/')[1])) : Number(b));
  } else if (amountStr.includes('/')) {
    const [n, d] = amountStr.split('/');
    amount = Number(n) / Number(d);
  } else {
    amount = Number(amountStr);
  }

  const unit = (m[2] || 'g').toLowerCase();
  const name = m[3].trim();
  return { amount, unit, name };
}

// Map common synonyms to improve match quality (AU/UK/US variants)
function normalizeNameForSearch(name) {
  const syn = [
    [/\bscallions?\b/gi, 'green onion'],
    [/\bspring onions?\b/gi, 'green onion'],
    [/\bcoriander\b/gi, 'cilantro'],
    [/\bcapsicum\b/gi, 'bell pepper'],
    [/\baubergine\b/gi, 'eggplant'],
    [/\bcourgette\b/gi, 'zucchini'],
    [/\bconfectioners sugar\b/gi, 'powdered sugar'],
    [/\bicing sugar\b/gi, 'powdered sugar'],
    [/\bgarbanzo beans?\b/gi, 'chickpeas'],
  ];
  let out = String(name || '');
  syn.forEach(([re, rep]) => { out = out.replace(re, rep); });
  return out;
}
// nutrition-match-api entry point
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const REGION = process.env.AWS_REGION || "ap-southeast-2";
const TABLE = process.env.FOODS_TABLE || "Foods_v2";
const GSI = process.env.FOODS_GSI || "gsi_name_prefix";
const CANDIDATE_LIMIT = Number(process.env.CANDIDATE_LIMIT || 15);
const MAX_GRAM_PER_LINE = Number(process.env.MAX_GRAM_PER_LINE || 2000);

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

function first1(s = "") {
  s = (s || "").trim().toLowerCase();
  const c = s[0];
  return (c >= "a" && c <= "z") ? c : "#";
}

function parseMaybeJson(v) {
  if (!v) return v;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function norm(s = "") {
  return String(s)
    .toLowerCase()
    .replace(/[\d./-]+/g, " ")
    .replace(/\b(cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|g|kg|oz|ml|l|pounds?|lb|slice|slices|cloves?)\b/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Enhanced normalization with multiple fallback strategies
function getSearchVariations(name) {
  const variations = [];
  const base = norm(normalizeNameForSearch(name));

  // Add the basic normalized version
  variations.push(base);

  // Add singular/plural variations
  if (base.endsWith('ies') && base.length > 4) {
    variations.push(base.slice(0, -3) + 'y');
  }
  if (base.endsWith('es') && base.length > 3) {
    variations.push(base.slice(0, -2));
  }
  if (base.endsWith('s') && base.length > 3) {
    variations.push(base.slice(0, -1)); // Remove 's'
  } else if (!base.endsWith('s')) {
    variations.push(base + 's'); // Add 's'
  }

  // Add common food word simplifications
  const simplifications = [
    [/\bfresh\s+/, ''],
    [/\braw\s+/, ''],
    [/\borganic\s+/, ''],
    [/\bdried\s+/, ''],
    [/\bcooked\s+/, ''],
    [/\bboiled\s+/, ''],
    [/\bsteamed\s+/, ''],
    [/\bfried\s+/, ''],
    [/\bgrilled\s+/, ''],
    [/\bbaked\s+/, ''],
    [/\broasted\s+/, ''],
    [/\bwhole\s+/, ''],
    [/\bground\s+/, ''],
    [/\bchopped\s+/, ''],
    [/\bsliced\s+/, ''],
    [/\bdiced\s+/, ''],
    [/\bminced\s+/, ''],
  ];

  simplifications.forEach(([pattern, replacement]) => {
    const simplified = base.replace(pattern, replacement).trim();
    if (simplified && simplified !== base && !variations.includes(simplified)) {
      variations.push(simplified);
    }
  });

  // Add partial matches - prioritize noun-like words over adjectives
  // Skip common adjectives/descriptors that appear at the beginning
  const skipWords = new Set(['thinly', 'thickly', 'finely', 'coarsely', 'lightly', 'heavily',
                              'fresh', 'freshly', 'frozen', 'dried', 'canned', 'raw', 'cooked',
                              'low', 'high', 'reduced', 'extra', 'packed', 'chopped',
                              'sliced', 'diced', 'minced', 'ground', 'shredded',
                              // common colors that are not specific enough on their own for single tokens
                              'green', 'red', 'black', 'white', 'yellow', 'brown',
                              // generic words that cause broad matches as singles
                              'vegetable']);

  // Words to drop from phrase-building (preparation/directive tokens),
  // but keep color/descriptor words for phrases like "green onion".
  const directiveWords = new Set(['divided', 'seeded', 'pitted', 'julienned', 'leaves',
                                  'for', 'serving', 'serve', 'white', 'part', 'only']);

  // Single generic tokens to avoid querying alone
  const bannedGenericSingles = new Set(['green', 'red', 'black', 'white', 'yellow', 'brown', 'vegetable', 'fresh', 'freshly']);

  const wordsAll = base.split(/\s+/);
  const words = wordsAll.filter(w => w.length > 3 && !directiveWords.has(w));
  if (words.length > 1) {
    // Add multi-word combinations first (more specific)
    if (words.length >= 2) {
      // Last 2 words (e.g., "red cabbage" from "thinly sliced red cabbage")
      variations.push(words.slice(-2).join(' '));
    }
    if (words.length >= 3) {
      // Last 3 words (e.g., "sliced red cabbage")
      variations.push(words.slice(-3).join(' '));
    }

    // Then add individual words, but skip adjectives
    words.forEach(word => {
      if (!skipWords.has(word) && !variations.includes(word) && !bannedGenericSingles.has(word)) {
        variations.push(word);
      }
    });
  }

  return variations.filter(v => v.length > 0);
}

// Decide if an ingredient line should contribute negligible nutrition
function isNegligibleIngredient(amount, unit, name) {
  const n = String(name || '').toLowerCase();
  if (/to taste|season to taste|pinch|dash|garnish|for garnish|for serving|to serve|optional/.test(n)) return true;
  // If no amount parsed, and it's seasoning/spice/herb, skip
  if (!amount || amount === 0) {
    if (/(salt|pepper|seasoning|spice|herbs?)/.test(n)) return true;
  }
  return false;
}

// Normalize and accumulate nutrition into canonical keys, with unit fixes where possible
const NUTRIENT_KEY_ALIASES = {
  calories: ['energy_kcal', 'kcal'],
  protein: ['protein_g'],
  total_fat: ['fat', 'fat_total', 'total_fat_g'],
  carbohydrates: ['carbs', 'carbohydrate', 'carbohydrates_g'],
  dietary_fiber: ['fiber', 'fiber_g'],
  total_sugars: ['sugars', 'sugar', 'sugars_g'],
  saturated_fats: ['saturated_fat', 'sat_fat', 'saturated_fats_g'],
  trans_fats: ['trans_fat', 'trans_fats_g'],
  vitamin_d_iu: ['vitamin_d', 'vitamin_d_ug'],
  calcium: ['calcium_mg'],
  iron: ['iron_mg'],
  potassium: ['potassium_mg']
};

function accumulateNutrition(summary, nutrition100g, gram) {
  const factor = (Number(gram) || 0) / 100;
  if (factor <= 0) return;

  const add = (key, value) => {
    const n = Number(value) * factor;
    if (!Number.isFinite(n) || n <= 0) return;
    summary[key] = (summary[key] || 0) + n;
  };

  const coveredKeys = new Set();

  // First, map aliases to canonical keys
  for (const [canon, aliases] of Object.entries(NUTRIENT_KEY_ALIASES)) {
    if (nutrition100g[canon] != null) {
      add(canon, nutrition100g[canon]);
      coveredKeys.add(canon);
      continue;
    }

    for (const alias of aliases) {
      if (nutrition100g[alias] == null) continue;

      if (canon === 'vitamin_d_iu' && alias === 'vitamin_d_ug') {
        add('vitamin_d_iu', Number(nutrition100g[alias]) * 40); // 1 µg = 40 IU
        coveredKeys.add('vitamin_d_iu');
      } else {
        add(canon, nutrition100g[alias]);
        coveredKeys.add(canon);
      }

      coveredKeys.add(alias);
      break;
    }
  }

  // Also accumulate any remaining numeric keys as-is (backward compatibility)
  for (const [k, v] of Object.entries(nutrition100g)) {
    if (coveredKeys.has(k)) continue;
    const n = Number(v) * factor;
    if (!Number.isFinite(n) || n <= 0) continue;
    summary[k] = (summary[k] || 0) + n;
  }
}

function addInto(sum, obj) {
  if (!obj) return;
  for (const [k, v] of Object.entries(obj)) {
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    sum[k] = (sum[k] || 0) + n;
  }
}

exports.handler = async (event) => {
  const headers = {
    "access-control-allow-origin": "*",
    "content-type": "application/json",
    "access-control-allow-headers": "*",
  };
  try {
    // Accept either a stringified `body` (API Gateway) or top-level `ingredients` (Lambda console)
    let body = null;
    if (event && event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (err) {
        console.log('Could not JSON.parse(event.body), using raw body:', err && err.message);
        body = event.body;
      }
    } else if (event && event.ingredients) {
      body = { ingredients: event.ingredients };
    } else if (event) {
      // fallback: maybe payload was provided directly
      body = event;
    }

    if (!body) {
      console.log('Missing body / ingredients in event:', JSON.stringify(event).slice(0, 1000));
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing body' }) };
    }

    const { ingredients } = body;
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'ingredients[] required' }) };
    }

    const results = [];
    const summary = {};

    for (const rawItem of ingredients) {
      // rawItem can be string or object { text, label }
      const raw = typeof rawItem === 'string' ? rawItem : (rawItem.text || '');
      const providedLabel = typeof rawItem === 'object' ? (rawItem.label || null) : null;
      // Parse amount, unit, and main ingredient
      const { amount, unit, name } = parseAmountUnit(raw);
      const loweredName = name.toLowerCase();
      // Skip negligible or optional
      const negligible = isNegligibleIngredient(amount, unit, loweredName);
      const searchVariations = getSearchVariations(name);

      if (searchVariations.length === 0) {
        results.push({ ingredient: rawItem, query: name, match: null, search_attempts: [] });
        continue;
      }

      // Try multiple search variations until we find a match
      let candidate = null;
      let searchAttempts = [];
      let successfulQuery = null;

      for (const q of searchVariations) {
        // Query by prefix with more candidates
        let data = await ddb.send(new QueryCommand({
          TableName: TABLE,
          IndexName: GSI,
          KeyConditionExpression: "name_lc_first1 = :pk AND begins_with(name_lc, :pfx)",
          ExpressionAttributeValues: { ":pk": first1(q), ":pfx": q },
          Limit: CANDIDATE_LIMIT,
        }));

        const items = data.Items || [];
        searchAttempts.push({ query: q, candidates: items.length });

        if (items.length === 0) continue;

        // Score and rank candidates
        const scoredCandidates = items.map(item => {
          let score = 0;
          const itemName = (item.name_lc || '').toLowerCase();

          // Exact match gets highest score
          if (itemName === q) score += 100;

          // Close match (starts with query)
          else if (itemName.startsWith(q)) score += 80;

          // Contains query
          else if (itemName.includes(q)) score += 60;

          // Prefer generic/everyday items over branded
          if (String(item.type || '').toLowerCase() === 'everyday') score += 25;
          if (/\bby\b|\bllc\b|\binc\b|\bltd\b/.test(itemName)) score -= 20;

          // Label matching bonus
          if (providedLabel) {
            const rawLabels = parseMaybeJson(item.labels);
            let labelKeys = [];
            if (Array.isArray(rawLabels)) {
              labelKeys = rawLabels.map(String);
            } else if (rawLabels && typeof rawLabels === 'object') {
              labelKeys = Object.keys(rawLabels).map(String);
            } else if (typeof rawLabels === 'string') {
              try {
                const p = JSON.parse(rawLabels);
                if (Array.isArray(p)) labelKeys = p.map(String);
                else if (p && typeof p === 'object') labelKeys = Object.keys(p).map(String);
                else labelKeys = [String(p)];
              } catch (e) {
                labelKeys = [rawLabels];
              }
            }
            if (labelKeys.includes(String(providedLabel))) score += 50;
          }

          return { item, score, name: itemName };
        });

        // Sort by score and take the best match
        scoredCandidates.sort((a, b) => b.score - a.score);

        // Require higher score (80+) to avoid bad matches
        // Score 60 was too low and matched unrelated items like "thinly" -> chocolate almonds
        if (scoredCandidates.length > 0 && scoredCandidates[0].score >= 80) {
          candidate = scoredCandidates[0].item;
          successfulQuery = q;
          console.log(`Found match for "${name}" using query "${q}": ${candidate.name} (score: ${scoredCandidates[0].score})`);
          break;
        }
      }
      if (candidate) {
        console.log('Selected id:', candidate.id, 'name:', candidate.name);
        const nutrition = parseMaybeJson(candidate.nutrition_100g);
        // Convert unit to grams using smart conversion
        let gram = negligible ? 0 : convertToGrams(amount, unit, candidate.name);
        // Clamp unrealistic single-line amounts (safety net)
        if (gram > MAX_GRAM_PER_LINE) {
          console.log(`Clamping large gram value for ${candidate.name}: ${gram}g -> ${MAX_GRAM_PER_LINE}g`);
          gram = MAX_GRAM_PER_LINE;
        }
        // Accumulate nutrition based on actual amount used (with key normalization)
        accumulateNutrition(summary, nutrition, gram);
        results.push({
          ingredient: rawItem,
          query: searchVariations[0], // Show the first search term attempted
          match: {
            id: candidate.id,
            name: candidate.name,
            nutrition_100g: nutrition,
            gram_used: gram,
            matched_label: providedLabel || null
          },
          search_attempts: searchAttempts,
          successful_query: successfulQuery
        });
      } else {
        console.log(`No match found for "${name}" after trying variations:`, searchVariations);
        results.push({
          ingredient: rawItem,
          query: searchVariations[0] || name,
          match: null,
          search_attempts: searchAttempts,
          tried_variations: searchVariations
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        results,
        summary_100g_sum: summary,
        note: "Nutrition is estimated based on matched ingredient and parsed amount/unit. If no match, try simplifying ingredient name or supplementing database.",
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
