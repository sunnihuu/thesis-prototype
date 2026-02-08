import json

# Read the original GeoJSON file
with open('data/nyc-wholesale-markets.geojson', 'r') as f:
    data = json.load(f)

print(f"Original file has {len(data['features'])} features")

# Keep only essential properties and valid geometries
cleaned_features = []
for feature in data['features']:
    # Skip features without geometry
    if feature['geometry'] is None:
        continue
    
    # Keep only essential properties
    cleaned_feature = {
        'type': 'Feature',
        'properties': {
            'MARKET': feature['properties'].get('MARKET'),
            'NAME': feature['properties'].get('ACCOUNT NAME')
        },
        'geometry': feature['geometry']
    }
    cleaned_features.append(cleaned_feature)

# Create new GeoJSON with cleaned data
cleaned_data = {
    'type': 'FeatureCollection',
    'features': cleaned_features
}

print(f"Cleaned file has {len(cleaned_features)} features (removed {len(data['features']) - len(cleaned_features)} features without geometry)")

# Write the cleaned data
with open('data/nyc-wholesale-markets-clean.geojson', 'w') as f:
    json.dump(cleaned_data, f, separators=(',', ':'))

print("Cleaned file saved as: data/nyc-wholesale-markets-clean.geojson")
