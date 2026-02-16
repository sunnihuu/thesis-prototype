import csv
import json
import math

# File paths
GEOJSON_PATH = "data/2020_Neighborhood_Tabulation_Areas_(NTAs)_20260215.geojson"
CSV_PATH = "data/Emergency_Food_Supply_Gap_20260215.csv"
OUTPUT_PATH = "data/nta_supply_gap_2025.geojson"

# Load CSV data (latest year only)
def load_gap_data(csv_path, year="2025"):
    gap_data = {}
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["Year"] == year:
                nta = row["Neighborhood Tabulation Area NTA)"] or row["Neighborhood Tabulation Area (NTA)"]
                try:
                    gap = float(row["Supply Gap (lbs.)"].replace(",", ""))
                except Exception:
                    gap = None
                try:
                    food_insecure = float(row["Food Insecure Percentage"].replace("%", ""))
                except Exception:
                    food_insecure = None
                gap_data[nta] = {
                    "supply_gap": gap,
                    "food_insecure_pct": food_insecure,
                    "row": row
                }
    return gap_data

# Join CSV to GeoJSON and add log_gap
with open(GEOJSON_PATH, encoding='utf-8') as f:
    geo = json.load(f)

gap_data = load_gap_data(CSV_PATH)

for feature in geo["features"]:
    nta_code = feature["properties"].get("nta2020")
    gap_info = gap_data.get(nta_code)
    if gap_info and gap_info["supply_gap"] is not None:
        gap = gap_info["supply_gap"]
        # Log scale: use log10(abs(gap)+1), preserve sign
        log_gap = math.copysign(math.log10(abs(gap)+1), gap) if gap != 0 else 0
        feature["properties"]["supply_gap"] = gap
        feature["properties"]["log_gap"] = log_gap
        feature["properties"]["food_insecure_pct"] = gap_info["food_insecure_pct"]
    else:
        feature["properties"]["supply_gap"] = None
        feature["properties"]["log_gap"] = None
        feature["properties"]["food_insecure_pct"] = None

with open(OUTPUT_PATH, "w", encoding='utf-8') as f:
    json.dump(geo, f, ensure_ascii=False)

print(f"Joined GeoJSON written to {OUTPUT_PATH}")
