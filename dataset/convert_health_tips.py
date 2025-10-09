#!/usr/bin/env python3
import pandas as pd
import json
import re

NUTRITION_CATEGORIES = {
    "hydration","calcium","vitaminD","fiber","potassium",
    "protein","iron","low_sodium","heart_health","antioxidants",
    "digestion","metabolism","balanced_diet"
}
VALID_MEAL_TYPES = {"breakfast","brunch","lunch","dinner","snack","starter","main","side","any"}

def ensure_sentence(text: str) -> str:
    text = (text or "").strip()
    if text and not re.search(r"[\.!\?]$", text):
        text += "."
    return text

def infer_type(category: str) -> str:
    cat = (category or "").strip()
    return "nutrition" if cat in NUTRITION_CATEGORIES else "lifestyle"

def to_meal_types(text: str, tag: str = ""):
    t = (str(tag) or "").strip().lower()
    if t in VALID_MEAL_TYPES:
        return [t]
    s = (text or "").lower()
    if any(k in s for k in ["breakfast","morning"]):
        return ["breakfast"]
    if "lunch" in s:
        return ["lunch"]
    if any(k in s for k in ["dinner","evening meal","supper"]):
        return ["dinner"]
    if any(k in s for k in ["snack","between meals","midday snack","mid-morning"]):
        return ["snack"]
    if any(k in s for k in ["starter","appetizer"]):
        return ["starter"]
    if "main course" in s:
        return ["main"]
    if "side dish" in s or "side" in s:
        return ["side"]
    return ["any"]

def refine_general_category(text: str, original_category: str) -> str:
    if (original_category or "").strip().lower() != "general":
        return original_category
    s = (text or "").lower()
    if any(k in s for k in ["wash your hands", "handwashing", "hand washing", "sanitize", "hygiene", "clean your hands"]):
        return "hygiene"
    if any(k in s for k in ["stress", "anxiety", "mood", "gratitude", "meditation", "mindful", "mindfulness", "breath work", "breathe deeply", "relaxation"]):
        return "mental_health"
    if any(k in s for k in ["balanced diet", "balanced meals", "portion", "variety", "whole foods", "plate", "balance your", "eat a variety"]):
        return "balanced_diet"
    if any(k in s for k in ["sleep", "walk", "walking", "exercise", "stretch", "posture", "take the stairs", "move more"]):
        return "wellness"
    return "general"

KW_VEGETARIAN = {"vegetarian","tofu","bean","beans","legume","lentil","tempeh","quinoa","vegetable","veggies","plant-based","meatless"}
KW_VEGAN = {"vegan","plant-based","dairy-free","egg-free","no dairy","no eggs","fortified soy","soy milk","almond milk","oat milk"}
KW_KETO = {"keto","low-carb","low carb","ketogenic","high fat","healthy fats","avocado","eggs","cheese","butter","olive oil"}
KW_LOW_SOD = {"low sodium","no added salt","reduce salt","limit salt","unsalted","salt-free","no-salt","sodium"}
KW_LOW_SUG = {"low sugar","unsweetened","no sugar","sugar-free","limit sugar","added sugar","refined sugar","sweetened"}

def infer_diet_ok(text: str):
    t = (text or "").lower()
    tags = {"healthyish"}
    if any(k in t for k in KW_VEGETARIAN):
        tags.add("vegetarian")
    if any(k in t for k in KW_VEGAN):
        tags.add("vegan")
    if any(k in t for k in KW_KETO):
        tags.add("keto")
    if any(k in t for k in KW_LOW_SOD):
        tags.add("low_sodium")
    if any(k in t for k in KW_LOW_SUG):
        tags.add("low_sugar")
    return sorted(tags)

ALLERGY_MAP = {
    "dairy": ["milk","cheese","yogurt","butter","cream","ghee","whey"],
    "gluten": ["wheat","barley","rye","pasta","bread","noodles","flour","biscuit","cracker"],
    "nuts": ["nut","almond","peanut","walnut","cashew","hazelnut","pecan","pistachio"],
    "shellfish": ["shrimp","prawn","crab","lobster","oyster","clam","mussel","scallop"],
    "eggs": ["egg","omelet","omelette","scramble","scrambled eggs"],
    "soy": ["soy","tofu","soy milk","edamame","tempeh","soybean"],
    "fish": ["fish","salmon","tuna","mackerel","sardine","cod","trout","anchovy","herring"]
}
def infer_allergy_blocks(text: str):
    t = (text or "").lower()
    blocks = []
    for label, kws in ALLERGY_MAP.items():
        if any(k in t for k in kws):
            blocks.append(label)
    return sorted(set(blocks))

def convert_health_tips_v2(src_csv: str, out_json: str):
    df = pd.read_csv(src_csv)
    expected_cols = {"content", "category", "meal_tag"}
    missing = expected_cols - set(df.columns)
    if missing:
        raise ValueError(f"Missing expected columns: {missing}")

    df["content"] = df["content"].astype(str).str.strip()
    df = df[df["content"] != ""].copy()
    df = df.drop_duplicates(subset=["content"], keep="first")

    records = []
    for _, row in df.iterrows():
        text = ensure_sentence(row["content"])
        cat = refine_general_category(text, str(row["category"]).strip())
        rec = {
            "text": text,
            "category": cat if cat else "general",
            "type": infer_type(cat),
            "diet_ok": infer_diet_ok(text),
            "allergy_block": infer_allergy_blocks(text),
            "meal_types": to_meal_types(text, str(row.get("meal_tag","")))
        }
        records.append(rec)

    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="Convert tips CSV to health_tips_v2.json with refined categories, exact dedupe, and questionnaire tags.")
    p.add_argument("--src", required=True, help="Path to tips_final_*.csv")
    p.add_argument("--out", required=True, help="Path to output health_tips_v2.json")
    args = p.parse_args()
    convert_health_tips_v2(args.src, args.out)
