
// Mapbox access token provided by user
mapboxgl.accessToken = 'pk.eyJ1Ijoic3VubmlodSIsImEiOiJjbWQ2bDBwNzcwMThwMm9weTVjc2JuNG90In0.sVXA1xGrFWnG-1ZV_EyO1w';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10', // Basic gray base map
    center: [-73.935242, 40.730610],
    zoom: 10.5
});

// Add NYC truck routes GeoJSON as a layer after map loads
map.on('load', () => {
    // Add NYC Fresh Zoning GeoJSON as a fill layer
    map.addSource('nyc-fresh-zoining', {
        type: 'geojson',
        data: 'data/nyc-fresh-zoining.geojson'
    });

        // Color code by 'name' property (example: assign colors to unique names)
        // Define color mapping for demonstration (customize as needed)
        // Map specific zoning names to colors
        const zoningColorMap = {
            'Discretionary tax incentives': '#4CAF50', // green
            'Zoning incentives': '#8e44ad', // purple
            'Zoning AND discretionary tax incentives': '#e74c3c' // red
        };

        // Fetch the geojson to extract unique names for color mapping
        fetch('data/nyc-fresh-zoining.geojson')
            .then(resp => resp.json())
            .then(data => {
                const names = [...new Set(data.features.map(f => f.properties.name))];
                // Build match expression for Mapbox (case-insensitive)
                const matchExpr = ['match', ['downcase', ['get', 'name']]];
                names.forEach((name) => {
                    const key = name ? name.trim().toLowerCase() : '';
                    let color = '#ffe066';
                    if (key === 'discretionary tax incentives') color = '#4caf50';
                    else if (key === 'zoning incentives') color = '#8e44ad';
                    else if (key === 'zoning and discretionary tax incentives') color = '#e74c3c';
                    matchExpr.push(key, color);
                });
                matchExpr.push('#ffe066'); // default color

                map.addLayer({
                    id: 'nyc-fresh-zoining',
                    type: 'fill',
                    source: 'nyc-fresh-zoining',
                    layout: {},
                    paint: {
                        'fill-color': matchExpr,
                        'fill-opacity': 0.45
                    }
                });

                                // Add legend to sidebar legend tab
                                const legend = document.createElement('div');
                                legend.className = 'map-legend';
                                legend.innerHTML = `
                                    <strong>City Support for New Grocery Stores</strong><br><br>
                                    <span style="display:inline-block;width:16px;height:16px;background:#e74c3c;margin-right:8px;border-radius:3px;"></span>
                                    <b>Strong City Support</b><br>
                                    <span style="color:#888;font-size:0.97em;">Zoning changes + tax incentives</span><br><br>
                                    <span style="display:inline-block;width:16px;height:16px;background:#8e44ad;margin-right:8px;border-radius:3px;"></span>
                                    <b>Planning Support</b><br>
                                    <span style="color:#888;font-size:0.97em;">Zoning flexibility only</span><br><br>
                                    <span style="display:inline-block;width:16px;height:16px;background:#4caf50;margin-right:8px;border-radius:3px;"></span>
                                    <b>Financial Support</b><br>
                                    <span style="color:#888;font-size:0.97em;">Tax incentives only</span><br><br>
                                    <span style="font-size:0.97em;">📌 <b>Note:</b> These zones indicate where the City encourages supermarket development through planning and fiscal incentives.</span>
                                `;
                                const legendContainer = document.getElementById('dynamic-legends');
                                if (legendContainer) {
                                    legendContainer.innerHTML = '';
                                    legendContainer.appendChild(legend);
                                }
            });

    // Add NYC truck routes GeoJSON as a line layer above the fill
    map.addSource('nyc-truck-routes', {
        type: 'geojson',
        data: 'data/nyc-truck-routes-2026.geojson'
    });

    // Color code by routetype and use dash for truckroute=Y, solid for N
    // Define color mapping for routetype
    const routeTypeColors = {
        'Local': '#1a73e8',
        'Through': '#e67e22',
        'Default': '#888888'
    };

    map.addLayer({
        id: 'nyc-truck-routes',
        type: 'line',
        source: 'nyc-truck-routes',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': [
                'match',
                ['get', 'routetype'],
                'Local', routeTypeColors['Local'],
                'Through', routeTypeColors['Through'],
                routeTypeColors['Default']
            ],
            'line-width': 2.5,
            'line-opacity': 0.85,
            'line-dasharray': [
                'case',
                ['==', ['get', 'truckroute'], 'Y'],
                ['literal', [2, 2]], // dashed for truckroute=Y
                ['literal', [1, 0]]  // solid for truckroute!=Y
            ]
        }
    });
});

// Fit to bounds covering all NYC boroughs (approximate SW and NE corners)
const nycBounds = [
    [-74.25909, 40.477399], // SW (Staten Island)
    [-73.700272, 40.917577] // NE (Bronx/Queens border)
];
map.fitBounds(nycBounds, { padding: 40 });

// Add navigation controls
map.addControl(new mapboxgl.NavigationControl());

// Slider logic (placeholder for real data update)
const slider = document.getElementById('tension-slider');
slider.addEventListener('input', (e) => {
    // Placeholder: update map layer based on slider value
    // In a real app, this would update the composite choropleth
    // For now, just log the value
    console.log('Slider value:', e.target.value);
});

// Tooltip logic for truck routes
const tooltip = document.getElementById('tooltip');
map.on('mousemove', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['nyc-truck-routes'] });
    if (features.length > 0) {
        const f = features[0];
        tooltip.style.display = 'block';
        tooltip.style.left = (e.point.x + 20) + 'px';
        tooltip.style.top = (e.point.y + 20) + 'px';
        tooltip.innerHTML =
            `<strong>${f.properties.street || 'Unknown Street'}</strong><br>` +
            `Borough: ${f.properties.boroname || 'N/A'}<br>` +
            `Route Type: ${f.properties.routetype || 'N/A'}<br>` +
            `Truck Route: ${f.properties.truckroute === 'Y' ? 'Yes (dashed)' : 'No (solid)'}`;
    } else {
        tooltip.style.display = 'none';
    }
});
map.on('mouseout', () => {
    tooltip.style.display = 'none';
});
