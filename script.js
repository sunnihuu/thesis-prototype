// Mapbox GL JS Map Initialization

mapboxgl.accessToken = 'pk.eyJ1Ijoic3VubmlodSIsImEiOiJjbWQ2bDBwNzcwMThwMm9weTVjc2JuNG90In0.sVXA1xGrFWnG-1ZV_EyO1w';

let map; // Global map variable for layer control
document.addEventListener('DOMContentLoaded', function() {
    // Initialize map
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
                        'line-width': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            9, 0.5,   // Very thin when zoomed out
                            11, 1.5,  // Medium at mid zoom
                            13, 2.5,  // Current width at close zoom
                            15, 3     // Slightly thicker when very close
                        ],
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

        // Add Stormwater Flood Zones GeoJSON (converted to WGS84)
        map.addSource('stormwater-flood', {
            type: 'geojson',
            data: 'data/stormewater-flood-wgs84.geojson'
        });
        map.addLayer({
            id: 'stormwater-flood',
            type: 'fill',
            source: 'stormwater-flood',
            layout: {
                'visibility': 'visible'
            },
            paint: {
                'fill-color': [
                    'match',
                    ['get', 'Flooding_Category'],
                    1, '#6dd5ed', // Category 1: Nuisance flooding (light cyan-blue)
                    2, '#2193b0', // Category 2: Deep/contiguous flooding (deep blue)
                    '#4ecdc4'     // default
                ],
                'fill-opacity': 0.75,
                'fill-outline-color': '#2a9d8f'
            }
        });
        
        // Log to verify layer is added
        console.log('Stormwater flood layer added with WGS84 coordinates');

        // Add Wholesale Markets GeoJSON
        map.addSource('wholesale-markets', {
            type: 'geojson',
            data: 'data/nyc-wholesale-markets-clean.geojson'
        });
        
        map.addLayer({
            id: 'wholesale-markets',
            type: 'circle',
            source: 'wholesale-markets',
            layout: {
                'visibility': 'visible'
            },
            paint: {
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 5,
                    15, 12
                ],
                'circle-color': [
                    'match',
                    ['get', 'MARKET'],
                    'Hunts Point New Fulton Fish Market', '#3498db',
                    'Hunts Point Meat Market', '#e74c3c',
                    'Hunts Point Produce Market', '#27ae60',
                    'Adjacent to Hunts Point Market', '#f39c12',
                    'Gansevoort Meat Market', '#9b59b6',
                    'Brooklyn Wholesale Meat Market', '#c0392b',
                    '#95a5a6'
                ],
                'circle-opacity': 0.9,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#ffffff',
                'circle-stroke-opacity': 1
            }
        });
        
        console.log('Wholesale markets layer added');

        // Add hover popup for wholesale markets
        const marketPopup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false
        });

        map.on('mouseenter', 'wholesale-markets', (e) => {
            map.getCanvas().style.cursor = 'pointer';
            
            const coordinates = e.features[0].geometry.coordinates.slice();
            const marketType = e.features[0].properties.MARKET;
            const marketName = e.features[0].properties.NAME;
            
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }
            
            marketPopup
                .setLngLat(coordinates)
                .setHTML(`
                    <div style="font-family: 'Switzer', sans-serif;">
                        <strong style="font-size: 1.1em; color: #1a1a1a;">${marketName || 'Unknown Location'}</strong>
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                            <div style="font-size: 0.85em; color: #6b7280; margin-bottom: 4px;">Supplied through:</div>
                            <div style="font-size: 0.95em; color: #2563eb; font-weight: 500;">${marketType || 'Market System'}</div>
                        </div>
                    </div>
                `)
                .addTo(map);
        });

        map.on('mouseleave', 'wholesale-markets', () => {
            map.getCanvas().style.cursor = '';
            marketPopup.remove();
        });

        // Click handler for market nodes - shows market summary panel
        map.on('click', 'wholesale-markets', (e) => {
            const clickedMarket = e.features[0].properties.MARKET;
            
            // Get all features from the wholesale-markets source
            const allFeatures = map.querySourceFeatures('wholesale-markets');
            
            // Count companies by market type
            const marketCounts = {};
            allFeatures.forEach(feature => {
                const market = feature.properties.MARKET;
                marketCounts[market] = (marketCounts[market] || 0) + 1;
            });
            
            const companyCount = marketCounts[clickedMarket] || 0;
            
            // Determine market type category
            let typeCategory = 'Mixed';
            if (clickedMarket.includes('Produce')) typeCategory = 'Produce';
            else if (clickedMarket.includes('Meat')) typeCategory = 'Meat';
            else if (clickedMarket.includes('Fish') || clickedMarket.includes('Seafood')) typeCategory = 'Seafood';
            
            // Create summary explanation
            const explanations = {
                'Produce': 'This concentration of produce distributors makes the area a critical node in NYC\'s fresh food distribution system.',
                'Meat': 'This concentration of meat wholesalers represents a critical choke point in the city\'s protein supply chain.',
                'Seafood': 'This concentration of seafood importers represents a critical node for NYC\'s seafood supply.',
                'Mixed': 'This market concentration represents a critical infrastructure node in NYC\'s food distribution system.'
            };
            
            const explanation = explanations[typeCategory] || explanations['Mixed'];
            
            // Get sample companies
            const sampleCompanies = allFeatures
                .filter(f => f.properties.MARKET === clickedMarket)
                .slice(0, 5)
                .map(f => ({
                    name: f.properties.NAME,
                    market: f.properties.MARKET
                }));
            
            // Show market detail panel
            const marketPanel = document.getElementById('market-detail-panel');
            const contentDiv = document.getElementById('market-detail-content');
            
            let companiesHTML = `
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #d1d5db;">
                    <a href="#" onclick="toggleCompanies(event)" style="color: #2563eb; text-decoration: none; font-size: 0.9em; font-weight: 500;">+ View example companies</a>
                    <div id="sample-companies" style="display: none; margin-top: 8px; padding: 8px; background: #fff; border-left: 3px solid #dbeafe;">
                        <div style="font-size: 0.8em; color: #1e40af; font-weight: 500; margin-bottom: 6px;">Sample Licensed Entities:</div>
            `;
            
            sampleCompanies.forEach((company, idx) => {
                companiesHTML += `<div style="font-size: 0.85em; color: #4b5563; margin: 4px 0;">• ${company.name}</div>`;
            });
            
            companiesHTML += `
                        <div style="font-size: 0.75em; color: #9ca3af; margin-top: 8px; font-style: italic; line-height: 1.4;">
                            Note: This dataset records licensed wholesale entities but does not capture downstream delivery routes or customer locations.
                        </div>
                    </div>
                </div>
            `;
            
            contentDiv.innerHTML = `
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 0.85em; color: #6b7280; margin-bottom: 4px;">Market Node</div>
                    <div style="font-size: 1.15em; font-weight: 600; color: #1a1a1a;">${clickedMarket}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                    <div style="padding: 8px; background: #fff; border-radius: 4px; border: 1px solid #e5e7eb;">
                        <div style="font-size: 0.75em; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Licensed Companies</div>
                        <div style="font-size: 1.3em; font-weight: 700; color: #2563eb;">${companyCount}+</div>
                    </div>
                    <div style="padding: 8px; background: #fff; border-radius: 4px; border: 1px solid #e5e7eb;">
                        <div style="font-size: 0.75em; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Type</div>
                        <div style="font-size: 1.1em; font-weight: 600; color: #374151;">${typeCategory}</div>
                    </div>
                </div>
                
                <div style="padding: 10px; background: #fffbeb; border-left: 3px solid #fbbf24; border-radius: 4px; margin-bottom: 12px;">
                    <div style="font-size: 0.9em; color: #78350f; line-height: 1.5;">${explanation}</div>
                </div>
                
                ${companiesHTML}
            `;
            
            marketPanel.style.display = 'block';
            
            // Close button
            document.getElementById('market-detail-close').onclick = () => {
                marketPanel.style.display = 'none';
            };
        });
        
        // Global function for toggling companies display
        window.toggleCompanies = function(e) {
            e.preventDefault();
            const companiesDiv = document.getElementById('sample-companies');
            companiesDiv.style.display = companiesDiv.style.display === 'none' ? 'block' : 'none';
        };

        // Add Census Tracts with pre-calculated logistics fragility scores
        map.addSource('census-tracts', {
            type: 'geojson',
            data: 'data/census-tracts-fragility.geojson'
        });
        
        console.log('Census tracts source added with pre-calculated fragility scores');
        
        // Wait for census data to load before adding layers
        map.on('sourcedata', (e) => {
            if (e.sourceId === 'census-tracts' && e.isSourceLoaded) {
                console.log('Census tracts data loaded successfully');
                const features = map.querySourceFeatures('census-tracts');
                console.log(`Census tracts loaded: ${features.length} features`);
            }
        });
        
        // Add census tract fill layer colored by fragility score
        map.addLayer({
            id: 'census-tracts-fill',
            type: 'fill',
            source: 'census-tracts',
            paint: {
                'fill-color': [
                    'step',
                    ['get', 'logistics_fragility'],
                    'rgba(255, 255, 255, 0)', // very low fragility: transparent
                    0.2, '#fef3c7', // low fragility: light yellow
                    0.4, '#fcd34d', // yellow
                    0.5, '#fb923c', // orange
                    0.6, '#f87171', // light red
                    0.7, '#ef4444', // red
                    0.8, '#dc2626'  // high fragility: deep red
                ],
                'fill-opacity': 0.7
            }
        }, 'nyc-truck-routes'); // Add below truck routes
        
        console.log('Census tracts fill layer added');
        
        // Add census tract outline layer
        map.addLayer({
            id: 'census-tracts-outline',
            type: 'line',
            source: 'census-tracts',
            paint: {
                'line-color': '#d1d5db',
                'line-width': 0.5,
                'line-opacity': 0.6
            }
        });
        
        console.log('Census tracts outline layer added');
        
        // Add hover highlight layer
        map.addLayer({
            id: 'census-tracts-hover',
            type: 'fill',
            source: 'census-tracts',
            paint: {
                'fill-color': '#627BC1',
                'fill-opacity': 0.3
            },
            filter: ['==', 'geoid', '']
        });
        
        // Add selected tract highlight layer
        map.addLayer({
            id: 'census-tracts-selected',
            type: 'line',
            source: 'census-tracts',
            paint: {
                'line-color': '#1976d2',
                'line-width': 3,
                'line-opacity': 1
            },
            filter: ['==', 'geoid', '']
        });
        
        let hoveredTractId = null;
        let selectedTractId = null;
        
        // Hover effect
        map.on('mousemove', 'census-tracts-fill', (e) => {
            if (e.features.length > 0) {
                const feature = e.features[0];
                const tractId = feature.properties.geoid || feature.id || '';
                
                if (hoveredTractId !== tractId) {
                    hoveredTractId = tractId;
                    map.setFilter('census-tracts-hover', ['==', 'geoid', tractId]);
                }
                
                map.getCanvas().style.cursor = 'pointer';
            }
        });
        
        map.on('mouseleave', 'census-tracts-fill', () => {
            hoveredTractId = null;
            map.setFilter('census-tracts-hover', ['==', 'geoid', '']);
            map.getCanvas().style.cursor = '';
        });
        
        // Click to select/deselect tract
        map.on('click', 'census-tracts-fill', (e) => {
            if (e.features.length > 0) {
                const feature = e.features[0];
                const tractId = feature.properties.geoid || feature.id || '';
                
                if (selectedTractId === tractId) {
                    // Deselect if clicking the same tract
                    selectedTractId = null;
                    map.setFilter('census-tracts-selected', ['==', 'geoid', '']);
                    console.log('Census tract deselected');
                } else {
                    // Select new tract
                    selectedTractId = tractId;
                    map.setFilter('census-tracts-selected', ['==', 'geoid', tractId]);
                    console.log('Census tract selected:', tractId, feature.properties);
                    
                    // Zoom to the selected census tract
                    const geometry = feature.geometry;
                    if (geometry && geometry.coordinates) {
                        // Calculate bounds from the polygon coordinates
                        let bounds = new mapboxgl.LngLatBounds();
                        
                        const coords = geometry.type === 'Polygon' 
                            ? geometry.coordinates[0] 
                            : geometry.coordinates[0][0]; // MultiPolygon
                        
                        coords.forEach(coord => {
                            bounds.extend(coord);
                        });
                        
                        // Fit the map to the census tract bounds with padding
                        map.fitBounds(bounds, {
                            padding: 100,
                            duration: 1000
                        });
                    }
                }
            }
        });
        
        console.log('Census tracts layer added with hover and click interactions');

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
                    layout: {
                        'visibility': 'none'
                    },
                    paint: {
                        'fill-color': matchExpr,
                        'fill-opacity': 0.45
                    }
                });
                // Add legend
                const legend = document.createElement('div');
                legend.className = 'map-legend';
                legend.innerHTML = `
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
    });
});