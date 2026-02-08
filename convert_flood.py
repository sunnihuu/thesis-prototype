import json
from pyproj import Transformer

# Read the original GeoJSON
with open('data/stormewater-flood.geojson', 'r') as f:
    data = json.load(f)

# Create transformer from NY State Plane (feet) to WGS84
# EPSG:2263 is NAD83 / New York Long Island (ftUS)
try:
    transformer = Transformer.from_crs("EPSG:2263", "EPSG:4326", always_xy=True)
    print("Using EPSG:2263 (NY State Plane Long Island)")
except Exception as e:
    print(f"Error with EPSG:2263: {e}")
    # Try alternative
    transformer = Transformer.from_crs("EPSG:6539", "EPSG:4326", always_xy=True)
    print("Using EPSG:6539")

# Convert coordinates
def convert_coordinates(coords):
    if isinstance(coords[0], list):
        # Nested coordinates (polygon/multipolygon)
        return [convert_coordinates(c) for c in coords]
    else:
        # Single coordinate pair [x, y] or [x, y, z]
        x, y = coords[0], coords[1]
        lon, lat = transformer.transform(x, y)
        if len(coords) == 3:
            return [lon, lat, coords[2]]
        return [lon, lat]

# Process all features
for feature in data['features']:
    if feature['geometry']['type'] in ['Polygon', 'MultiPolygon']:
        feature['geometry']['coordinates'] = convert_coordinates(
            feature['geometry']['coordinates']
        )

# Write the converted GeoJSON
with open('data/stormewater-flood-wgs84.geojson', 'w') as f:
    json.dump(data, f)

print("Conversion complete! Created stormewater-flood-wgs84.geojson")
