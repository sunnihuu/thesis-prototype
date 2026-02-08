#!/usr/bin/env python3
"""
Data preparation for market-level analysis.

Three levels of abstraction:
1. Entity-level (unique companies by BIC NUMBER)
2. Market-level (aggregated by MARKET)
3. Tract-level (vulnerability scores - already done)
"""

import json
from collections import defaultdict

# Load raw wholesale markets data
print("Loading raw wholesale markets data...")
with open('data/nyc-wholesale-markets-clean.geojson', 'r') as f:
    raw_data = json.load(f)

print(f"Total records in dataset: {len(raw_data['features'])}")

# ============================================
# STEP 1: Entity-level deduplication by BIC
# ============================================
print("\n" + "="*60)
print("STEP 1: Entity-level deduplication")
print("="*60)

# Group by BIC NUMBER (unique identifier)
bic_to_records = defaultdict(list)
for feature in raw_data['features']:
    props = feature['properties']
    coords = feature['geometry']['coordinates']
    bic = props.get('BIC_NUMBER', props.get('NAME', 'unknown'))
    bic_to_records[bic].append({
        'name': props.get('NAME', ''),
        'market': props.get('MARKET', ''),
        'lon': coords[0],
        'lat': coords[1],
        'bic': bic
    })

print(f"Unique BIC numbers: {len(bic_to_records)}")

entity_data = []
for bic, records in bic_to_records.items():
    # Use most common coordinates for this company
    lons = [r['lon'] for r in records]
    lats = [r['lat'] for r in records]
    avg_lon = sum(lons) / len(lons)
    avg_lat = sum(lats) / len(lats)
    
    entity = {
        'bic_number': bic,
        'name': records[0]['name'],
        'market': records[0]['market'],
        'lon': avg_lon,
        'lat': avg_lat,
        'record_count': len(records)
    }
    entity_data.append(entity)

print(f"Unique entities (by BIC): {len(entity_data)}")

# Save entity-level data
entity_geojson = {
    'type': 'FeatureCollection',
    'features': [
        {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [e['lon'], e['lat']]
            },
            'properties': {
                'bic_number': e['bic_number'],
                'name': e['name'],
                'market': e['market'],
                'record_count': e['record_count']
            }
        }
        for e in entity_data
    ]
}

with open('data/wholesale-entities.geojson', 'w') as f:
    json.dump(entity_geojson, f)

print(f"✓ Saved: data/wholesale-entities.geojson ({len(entity_data)} entities)")

# ============================================
# STEP 2: Market-level aggregation
# ============================================
print("\n" + "="*60)
print("STEP 2: Market-level aggregation")
print("="*60)

market_to_entities = defaultdict(set)
market_to_centroid = defaultdict(list)

for entity in entity_data:
    market = entity['market']
    market_to_entities[market].add(entity['bic_number'])
    market_to_centroid[market].append((entity['lon'], entity['lat']))

market_summary = []

for market_name in sorted(market_to_entities.keys()):
    unique_bics = market_to_entities[market_name]
    coords = market_to_centroid[market_name]
    
    # Calculate centroid
    avg_lon = sum(c[0] for c in coords) / len(coords)
    avg_lat = sum(c[1] for c in coords) / len(coords)
    
    # Count original records for this market
    record_count = 0
    for feature in raw_data['features']:
        if feature['properties'].get('MARKET') == market_name:
            record_count += 1
    
    # Detect market type
    market_type = 'Mixed'
    if 'Produce' in market_name:
        market_type = 'Produce'
    elif 'Meat' in market_name:
        market_type = 'Meat'
    elif 'Fish' in market_name or 'Seafood' in market_name:
        market_type = 'Seafood'
    
    market_summary.append({
        'market_name': market_name,
        'market_type': market_type,
        'unique_companies': len(unique_bics),
        'record_count': record_count,
        'centroid_lon': avg_lon,
        'centroid_lat': avg_lat
    })

print(f"\nMarket summary:")
for m in sorted(market_summary, key=lambda x: x['unique_companies'], reverse=True)[:10]:
    print(f"  {m['market_name']}: {m['unique_companies']} entities, {m['record_count']} records")
print(f"  ... and {len(market_summary) - 10} more markets")

# Save market-level summary
market_geojson = {
    'type': 'FeatureCollection',
    'features': [
        {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [m['centroid_lon'], m['centroid_lat']]
            },
            'properties': {
                'market_name': m['market_name'],
                'market_type': m['market_type'],
                'unique_companies': m['unique_companies'],
                'record_count': m['record_count']
            }
        }
        for m in market_summary
    ]
}

with open('data/market-nodes-summary.geojson', 'w') as f:
    json.dump(market_geojson, f)

print(f"\n✓ Saved: data/market-nodes-summary.geojson ({len(market_summary)} markets)")

# Save as CSV for reference
with open('data/market-summary.csv', 'w') as f:
    f.write('market_name,market_type,unique_companies,record_count\n')
    for m in market_summary:
        f.write(f'"{m["market_name"]}",{m["market_type"]},{m["unique_companies"]},{m["record_count"]}\n')

print(f"✓ Saved: data/market-summary.csv")

# ============================================
# Summary
# ============================================
print("\n" + "="*60)
print("DATA ABSTRACTION SUMMARY")
print("="*60)
print(f"\nLevel 1 (Entity-level):")
print(f"  • Records: {len(entity_data)} unique companies")
print(f"  • Use for: Sample company lists, entity drill-down")
print(f"  • File: data/wholesale-entities.geojson")

print(f"\nLevel 2 (Market-level):")
print(f"  • Records: {len(market_summary)} market nodes")
print(f"  • Use for: Map visualization, market concentration")
print(f"  • File: data/market-nodes-summary.geojson")

print(f"\nLevel 3 (Tract-level):")
print(f"  • Records: 2,325 census tracts")
print(f"  • Use for: Vulnerability scoring")
print(f"  • File: data/census-tracts-fragility.geojson")

print(f"\n" + "="*60)
print("Original data preserved (not deleted):")
print(f"  • data/nyc-wholesale-markets-clean.geojson ({len(raw_data['features'])} records)")
print("="*60)
