import json
import math
from shapely.geometry import shape, Point, LineString
from shapely.ops import unary_union
import numpy as np

print("Loading data files...")

# Load all data
with open('data/census-tracts.geojson', 'r') as f:
    tracts_data = json.load(f)

with open('data/stormewater-flood-wgs84.geojson', 'r') as f:
    flood_data = json.load(f)

with open('data/nyc-truck-routes-2026.geojson', 'r') as f:
    truck_data = json.load(f)

with open('data/nyc-wholesale-markets-clean.geojson', 'r') as f:
    market_data = json.load(f)

print(f"Loaded {len(tracts_data['features'])} census tracts")

# Create market hubs by aggregating similar market locations
print("Aggregating market hubs...")
market_hubs = {}
for feature in market_data['features']:
    if not feature.get('geometry') or not feature['geometry'].get('coordinates'):
        continue
    market_type = feature['properties'].get('MARKET', 'Other')
    if market_type not in market_hubs:
        market_hubs[market_type] = []
    market_hubs[market_type].append(Point(feature['geometry']['coordinates']))

# Calculate centroid for each market hub
hub_centroids = []
for market_type, points in market_hubs.items():
    if points:
        avg_x = sum(p.x for p in points) / len(points)
        avg_y = sum(p.y for p in points) / len(points)
        hub_centroids.append(Point(avg_x, avg_y))

print(f"Created {len(hub_centroids)} market hub centroids")

# Create spatial indices for faster processing
print("Creating spatial geometries...")
flood_shapes = [shape(f['geometry']) for f in flood_data['features'] if f.get('geometry')]
truck_routes = []
for f in truck_data['features']:
    if f.get('geometry'):
        route_type = f['properties'].get('routetype', '')
        weight = 1.0 if route_type == 'Through' else 0.6
        truck_routes.append((shape(f['geometry']), weight))

print("Calculating fragility scores for each tract...")

# Calculate scores for each tract
tract_scores = []
for i, tract in enumerate(tracts_data['features']):
    if i % 100 == 0:
        print(f"Processing tract {i}/{len(tracts_data['features'])}")
    
    tract_geom = shape(tract['geometry'])
    tract_area = tract_geom.area
    tract_centroid = tract_geom.centroid
    
    # A) Flood Exposure
    flood_intersection_area = 0
    for flood_geom in flood_shapes:
        try:
            if tract_geom.intersects(flood_geom):
                intersection = tract_geom.intersection(flood_geom)
                flood_intersection_area += intersection.area
        except:
            pass
    
    flood_exposure = flood_intersection_area / tract_area if tract_area > 0 else 0
    
    # B) Truck Dependency
    truck_length = 0
    for route_geom, weight in truck_routes:
        try:
            if tract_geom.intersects(route_geom):
                intersection = tract_geom.intersection(route_geom)
                truck_length += intersection.length * weight
        except:
            pass
    
    # C) Hub Proximity
    min_distance = float('inf')
    for hub in hub_centroids:
        dist = tract_centroid.distance(hub)
        if dist < min_distance:
            min_distance = dist
    
    tract_scores.append({
        'geoid': tract['properties'].get('geoid', ''),
        'flood_exposure': flood_exposure,
        'truck_dependency': truck_length,
        'hub_proximity': min_distance,
        'geometry': tract['geometry'],
        'properties': tract['properties']
    })

print("Normalizing scores...")

# Normalize 0-1
max_flood = max(t['flood_exposure'] for t in tract_scores)
max_truck = max(t['truck_dependency'] for t in tract_scores)
max_hub = max(t['hub_proximity'] for t in tract_scores)

print(f"Max values - Flood: {max_flood:.4f}, Truck: {max_truck:.4f}, Hub: {max_hub:.4f}")

for score in tract_scores:
    score['flood_exposure_norm'] = score['flood_exposure'] / max_flood if max_flood > 0 else 0
    score['truck_dependency_norm'] = score['truck_dependency'] / max_truck if max_truck > 0 else 0
    # Invert hub proximity: closer = higher risk
    score['hub_proximity_norm'] = 1 - (score['hub_proximity'] / max_hub) if max_hub > 0 else 0
    
    # Composite score
    score['logistics_fragility'] = (
        0.4 * score['truck_dependency_norm'] +
        0.4 * score['flood_exposure_norm'] +
        0.2 * score['hub_proximity_norm']
    )

print("Creating output GeoJSON...")

# Create output GeoJSON
output_features = []
for score in tract_scores:
    feature = {
        'type': 'Feature',
        'geometry': score['geometry'],
        'properties': {
            **score['properties'],
            'flood_exposure': round(score['flood_exposure'], 4),
            'truck_dependency': round(score['truck_dependency'], 4),
            'hub_proximity': round(score['hub_proximity'], 4),
            'flood_exposure_norm': round(score['flood_exposure_norm'], 4),
            'truck_dependency_norm': round(score['truck_dependency_norm'], 4),
            'hub_proximity_norm': round(score['hub_proximity_norm'], 4),
            'logistics_fragility': round(score['logistics_fragility'], 4)
        }
    }
    output_features.append(feature)

output_geojson = {
    'type': 'FeatureCollection',
    'features': output_features
}

# Save to file
output_path = 'data/census-tracts-fragility.geojson'
with open(output_path, 'w') as f:
    json.dump(output_geojson, f)

print(f"✓ Saved fragility scores to {output_path}")
print(f"✓ Processed {len(output_features)} census tracts")
print("\nScore distribution:")
scores = [f['properties']['logistics_fragility'] for f in output_features]
print(f"  Min: {min(scores):.4f}")
print(f"  Max: {max(scores):.4f}")
print(f"  Mean: {np.mean(scores):.4f}")
print(f"  Median: {np.median(scores):.4f}")
