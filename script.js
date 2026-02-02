
// Mapbox access token provided by user
mapboxgl.accessToken = 'pk.eyJ1Ijoic3VubmlodSIsImEiOiJjbWQ2bDBwNzcwMThwMm9weTVjc2JuNG90In0.sVXA1xGrFWnG-1ZV_EyO1w';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10', // Use Mapbox's light gray style
    center: [-73.935242, 40.730610],
    zoom: 10.5
});

// Add NYC truck routes GeoJSON as a layer after map loads
map.on('load', () => {
    map.addSource('nyc-truck-routes', {
        type: 'geojson',
        data: 'data/nyc-truck-routes-2026.geojson'
    });
    map.addLayer({
        id: 'nyc-truck-routes',
        type: 'line',
        source: 'nyc-truck-routes',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#1a73e8',
            'line-width': 2.5,
            'line-opacity': 0.85
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

// Tooltip logic (placeholder)
const tooltip = document.getElementById('tooltip');
map.on('mousemove', (e) => {
    // Placeholder: show tooltip at mouse position with example text
    // In a real app, this would use map features under the mouse
    tooltip.style.display = 'block';
    tooltip.style.left = (e.point.x + 20) + 'px';
    tooltip.style.top = (e.point.y + 20) + 'px';
    tooltip.innerHTML =
        '<strong>Example Area</strong><br>' +
        '“High vulnerability here is driven by carbon-intensive food deliveries combined with limited household storage capacity.”';
});
map.on('mouseout', () => {
    tooltip.style.display = 'none';
});
