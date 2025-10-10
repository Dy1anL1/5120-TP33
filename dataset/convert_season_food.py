import pandas as pd
import json

input_file = "season food.xlsx"
output_file = "season_food.json"

excel_data = pd.read_excel(input_file, sheet_name=None)
season_data = {}

for sheet_name, df in excel_data.items():
    df = df.dropna(how="all").fillna("")
    df.columns = [c.strip().lower() for c in df.columns]

    state = sheet_name.strip().upper()
    season_data[state] = {"fruits": {}, "vegetables": {}}

    if {"category", "item", "season"}.issubset(df.columns):
        for _, row in df.iterrows():
            category = row["category"].strip().lower()
            item = row["item"].strip().lower()
            season = row["season"].strip().lower()
            if not category or not item or not season:
                continue
            if category not in ["fruits", "vegetables"]:
                continue
            if item not in season_data[state][category]:
                season_data[state][category][item] = []
            if season not in season_data[state][category][item]:
                season_data[state][category][item].append(season)

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(season_data, f, ensure_ascii=False, indent=2)

print(f"Created {output_file}")
