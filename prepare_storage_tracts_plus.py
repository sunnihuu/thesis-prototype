#!/usr/bin/env python3
"""
Prepare storage_tracts_plus.geojson with precomputed hub distance and
placeholder sensor stats for lightweight web rendering.
"""

import json
import math


def ensure_closed_ring(coords):
    if not coords:
        return coords
    if coords[0] != coords[-1]:
        return coords + [coords[0]]
    return coords


def ring_centroid_area(coords):
    coords = ensure_closed_ring(coords)
    if len(coords) < 4:
        # Fallback to simple average
        xs = [c[0] for c in coords]
        ys = [c[1] for c in coords]
        if not xs or not ys:
            return 0.0, 0.0, 0.0
        return sum(xs) / len(xs), sum(ys) / len(ys), 0.0

    area = 0.0
    cx = 0.0
    cy = 0.0
    for i in range(len(coords) - 1):
        x0, y0 = coords[i]
        x1, y1 = coords[i + 1]
        cross = (x0 * y1) - (x1 * y0)
        area += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross

    if area == 0.0:
        xs = [c[0] for c in coords]
        ys = [c[1] for c in coords]
        return sum(xs) / len(xs), sum(ys) / len(ys), 0.0

    area *= 0.5
    cx /= (6.0 * area)
    cy /= (6.0 * area)
    return cx, cy, abs(area)


def geometry_centroid(geometry):
    gtype = geometry.get("type")
    coords = geometry.get("coordinates", [])

    if gtype == "Polygon":
        if not coords:
            return 0.0, 0.0
        cx, cy, _ = ring_centroid_area(coords[0])
        return cx, cy

    if gtype == "MultiPolygon":
        total_area = 0.0
        weighted_x = 0.0
        weighted_y = 0.0
        for polygon in coords:
            if not polygon:
                continue
            cx, cy, area = ring_centroid_area(polygon[0])
            if area == 0.0:
                continue
            total_area += area
            weighted_x += cx * area
            weighted_y += cy * area

        if total_area == 0.0:
            # Fallback to average of all vertices
            xs = []
            ys = []
            for polygon in coords:
                for ring in polygon:
                    xs.extend([p[0] for p in ring])
                    ys.extend([p[1] for p in ring])
            if not xs or not ys:
                return 0.0, 0.0
            return sum(xs) / len(xs), sum(ys) / len(ys)

        return weighted_x / total_area, weighted_y / total_area

    return 0.0, 0.0


def haversine_km(lon1, lat1, lon2, lat2):
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def load_hunts_point_centroid(market_path):
    with open(market_path, "r") as f:
        market_data = json.load(f)

    hunts_points = []
    for feature in market_data.get("features", []):
        name = feature.get("properties", {}).get("market_name", "")
        if "Hunts Point" in name:
            coords = feature.get("geometry", {}).get("coordinates", [])
            if len(coords) >= 2:
                hunts_points.append(coords)

    if not hunts_points:
        raise ValueError("No Hunts Point market nodes found in market-nodes-summary.geojson")

    avg_lon = sum(c[0] for c in hunts_points) / len(hunts_points)
    avg_lat = sum(c[1] for c in hunts_points) / len(hunts_points)
    return avg_lon, avg_lat


def main():
    storage_path = "data/storage_tracts.geojson"
    market_path = "data/market-nodes-summary.geojson"
    output_path = "data/storage_tracts_plus.geojson"

    hub_lon, hub_lat = load_hunts_point_centroid(market_path)
    print(f"Hunts Point hub centroid: {hub_lon:.6f}, {hub_lat:.6f}")

    with open(storage_path, "r") as f:
        storage_data = json.load(f)

    for feature in storage_data.get("features", []):
        centroid_lon, centroid_lat = geometry_centroid(feature.get("geometry", {}))
        dist_km = haversine_km(centroid_lon, centroid_lat, hub_lon, hub_lat)

        props = feature.setdefault("properties", {})
        props["dist_to_hub_km"] = round(dist_km, 3)
        props["sensor_count"] = 0
        props["sensor_mean"] = None
        props["sensor_p95"] = None

    with open(output_path, "w") as f:
        json.dump(storage_data, f)

    print(f"Saved: {output_path}")


if __name__ == "__main__":
    main()
