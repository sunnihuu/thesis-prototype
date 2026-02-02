// ========== Mapbox GL JS 单地图精简版 ========== //

mapboxgl.accessToken = 'pk.eyJ1Ijoic3VubmlodSIsImEiOiJjbWQ2bDBwNzcwMThwMm9weTVjc2JuNG90In0.sVXA1xGrFWnG-1ZV_EyO1w';

// let map; // Removed duplicate declaration
document.addEventListener('DOMContentLoaded', function() {
    // 初始化地图
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v10',
        center: [-73.935242, 40.730610],
        zoom: 10.5
    });

    map.on('load', function() {
                // Add NYC Truck Routes GeoJSON as a line layer
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
                        // Riso-inspired palette
                        'line-color': [
                            'match',
                            ['get', 'routetype'],
                            'Local', '#ff595e',      // Riso Red
                            'Through', '#1982c4',   // Riso Blue
                            /* other */ '#6a4c93'    // Riso Purple
                        ],
                        'line-width': 2.5,
                        'line-opacity': 0.85,
                        'line-dasharray': [
                            'case',
                            ['==', ['get', 'truckroute'], 'Y'],
                            ['literal', [2, 2]], // Truck Route: dashed
                            ['literal', [1, 0]]  // Non-Truck Route: solid
                        ]
                    }
                });
        // Fit to bounds covering all NYC boroughs (approximate SW and NE corners)
        const nycBounds = [
            [-74.25909, 40.477399], // SW (Staten Island)
            [-73.700272, 40.917577] // NE (Bronx/Queens border)
        ];
        map.fitBounds(nycBounds, { padding: 40 });
        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl());

        // Add NYC Fresh Zoning GeoJSON as a fill layer
        map.addSource('nyc-fresh-zoining', {
            type: 'geojson',
            data: 'data/nyc-fresh-zoining.geojson'
        });
        fetch('data/nyc-fresh-zoining.geojson')
            .then(resp => resp.json())
            .then(data => {
                const names = [...new Set(data.features.map(f => f.properties.name))];
                const matchExpr = ['match', ['downcase', ['get', 'name']]];
                names.forEach((name) => {
                    const key = name ? name.trim().toLowerCase() : '';
                    let color = '#ffe066';
                    // Riso-inspired palette
                    if (key === 'discretionary tax incentives') color = '#ffca3a'; // Riso Yellow
                    else if (key === 'zoning incentives') color = '#8ac926';      // Riso Green
                    else if (key === 'zoning and discretionary tax incentives') color = '#ff595e'; // Riso Red
                    matchExpr.push(key, color);
                });
                matchExpr.push('#ffe066');
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
                // Add legend
                const legend = document.createElement('div');
                legend.className = 'map-legend';
                legend.innerHTML = `
                    <div style="font-weight:700;font-size:1.08em;margin-bottom:10px;">City Support for New Grocery Stores</div>
                    <div class="legend-row"><span class="legend-chip" style="background:#ff595e"></span><span class="legend-label"><b>Strong City Support</b></span></div>
                    <div class="legend-desc">Zoning changes + tax incentives</div>
                    <div class="legend-row"><span class="legend-chip" style="background:#8ac926"></span><span class="legend-label"><b>Planning Support</b></span></div>
                    <div class="legend-desc">Zoning flexibility only</div>
                    <div class="legend-row"><span class="legend-chip" style="background:#ffca3a"></span><span class="legend-label"><b>Financial Support</b></span></div>
                    <div class="legend-desc">Tax incentives only</div>
                    <div class="legend-note">📌 <b>Note:</b> These zones indicate where the City encourages supermarket development through planning and fiscal incentives.</div>
                    <hr style="margin:18px 0 10px 0;">
                    <div style="font-weight:700;font-size:1.08em;margin-bottom:10px;">Truck Routes</div>
                    <div class="legend-row"><span class="legend-line legend-dashed" style="border-top:2.5px dashed #ff595e;"></span><span class="legend-label">Local (riso red dashed)</span></div>
                    <div class="legend-row"><span class="legend-line legend-dashed" style="border-top:2.5px dashed #1982c4;"></span><span class="legend-label">Through (riso blue dashed)</span></div>
                    <div class="legend-row"><span class="legend-line legend-solid" style="border-top:2.5px solid #6a4c93;"></span><span class="legend-label">Other (riso purple solid)</span></div>
                `;
                const legendContainer = document.getElementById('dynamic-legends');
                if (legendContainer) {
                    legendContainer.innerHTML = '';
                    legendContainer.appendChild(legend);
                }
            });

        // Slider logic (placeholder for real data update)
        const slider = document.getElementById('tension-slider');
        if (slider) {
            slider.addEventListener('input', (e) => {
                // Placeholder: update map layer based on slider value
                // In a real app, this would update the composite choropleth
                // For now, just log the value
                console.log('Slider value:', e.target.value);
            });
        }

        // Mode switching logic
        const modeOverviewBtn = document.getElementById('mode-overview');
        const modeProbeBtn = document.getElementById('mode-probe');
        const overviewPanel = document.getElementById('overview-panel');
        const probePanel = document.getElementById('probe-panel');
        const legend = document.getElementById('dynamic-legends');
        const tensionBarSection = document.querySelector('.tension-bar-section');
        const toggleCluster = document.querySelector('.toggle-cluster');

        function setMode(mode) {
            if (mode === 'overview') {
                modeOverviewBtn.classList.add('active');
                modeProbeBtn.classList.remove('active');
                overviewPanel.style.display = '';
                probePanel.style.display = 'none';
                if (tensionBarSection) tensionBarSection.style.display = '';
                if (toggleCluster) toggleCluster.style.display = '';
                if (legend) legend.style.display = '';
            } else {
                modeOverviewBtn.classList.remove('active');
                modeProbeBtn.classList.add('active');
                overviewPanel.style.display = 'none';
                probePanel.style.display = '';
                if (tensionBarSection) tensionBarSection.style.display = 'none';
                if (toggleCluster) toggleCluster.style.display = 'none';
                if (legend) legend.style.display = 'none';
            }
        }

        if (modeOverviewBtn && modeProbeBtn) {
            modeOverviewBtn.addEventListener('click', () => setMode('overview'));
            modeProbeBtn.addEventListener('click', () => setMode('probe'));
        }

        // Tooltip logic for truck routes (remains in overview mode only)
        const tooltip = document.getElementById('tooltip');
        map.on('mousemove', (e) => {
            // Only show tooltip in overview mode
            if (modeOverviewBtn.classList.contains('active')) {
                const features = map.queryRenderedFeatures(e.point, { layers: ['nyc-truck-routes'] });
                if (features.length > 0) {
                    const f = features[0];
                    tooltip.style.display = 'block';
                    tooltip.style.left = (e.point.x + 20) + 'px';
                    tooltip.style.top = (e.point.y + 20) + 'px';
                    tooltip.innerHTML =
                        `<strong>${f.properties.street || 'Unknown Street'}</strong><br>` +
                        `Borough: ${f.properties.boroname || 'N/A'}`;
                } else {
                    tooltip.style.display = 'none';
                }
            } else {
                tooltip.style.display = 'none';
            }
        });

        map.on('mouseout', () => {
            tooltip.style.display = 'none';
        });
    }); // <-- 关闭 map.on('load', ...)
}); // <-- 关闭 DOMContentLoaded