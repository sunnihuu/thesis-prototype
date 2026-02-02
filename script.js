// ========== Mapbox GL JS 双地图 + Probe Lens 精简骨架 ========== //
mapboxgl.accessToken = 'pk.eyJ1Ijoic3VubmlodSIsImEiOiJjbWQ2bDBwNzcwMThwMm9weTVjc2JuNG90In0.sVXA1xGrFWnG-1ZV_EyO1w';

// ---------- DOM ----------
const wrapEl = document.getElementById("mapWrap");
const baseEl = document.getElementById("mapBase");
const topEl  = document.getElementById("mapTop");
const lensEl = document.getElementById("lens");
const overviewBtn = document.getElementById("mode-overview");
const probeBtn    = document.getElementById("mode-probe");
const panelOverview = document.getElementById("overview-panel");
const panelProbe    = document.getElementById("probe-panel");
const slider = document.getElementById("tension-slider");
const legendEl = document.getElementById("dynamic-legends");

// ---------- Config ----------
const STYLE_URL = "mapbox://styles/mapbox/light-v10";
const LENS_RADIUS = 120;
let probeOn = false;

// ---------- Map init ----------
const mapBase = new mapboxgl.Map({
    container: "mapBase",
    style: STYLE_URL,
    center: [-73.94, 40.70],
    zoom: 10.5,
    pitch: 0,
    bearing: 0,
    attributionControl: true,
});
const mapTop = new mapboxgl.Map({
    container: "mapTop",
    style: STYLE_URL,
    center: [-73.94, 40.70],
    zoom: 10.5,
    pitch: 0,
    bearing: 0,
    attributionControl: false,
    interactive: false,
});
mapBase.on("move", () => {
    const c = mapBase.getCenter();
    mapTop.jumpTo({
        center: c,
        zoom: mapBase.getZoom(),
        bearing: mapBase.getBearing(),
        pitch: mapBase.getPitch(),
    });
});
mapBase.on("load", () => {
    addProjectLayers(mapBase);
    mapTop.once("load", () => {
        addProjectLayers(mapTop);
        applyTopMapMuting(mapTop);
    });
});

// ---------- Probe Mode mechanics ----------
function setProbeMode(on) {
    probeOn = on;
    if (panelOverview && panelProbe) {
        panelOverview.style.display = on ? "none" : "block";
        panelProbe.style.display    = on ? "block" : "none";
    }
    if (slider) slider.style.display = on ? "none" : "block";
    if (legendEl) legendEl.style.display = on ? "none" : "block";
    if (!on) {
        baseEl.style.clipPath = "none";
        lensEl.style.display = "none";
        return;
    }
    lensEl.style.display = "block";
}
function onMouseMove(e) {
    if (!probeOn) return;
    const rect = wrapEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lensEl.style.left = `${x}px`;
    lensEl.style.top = `${y}px`;
    baseEl.style.clipPath = `circle(${LENS_RADIUS}px at ${x}px ${y}px)`;
    // panelProbe.innerHTML = `Location Probe<br>Carbon: 0.71<br>Inequality: 0.83<br>Combined: High`; // 可用假数据
}
wrapEl.addEventListener("mousemove", onMouseMove);
wrapEl.addEventListener("mouseleave", () => { if (probeOn) lensEl.style.display = "none"; });
wrapEl.addEventListener("mouseenter", () => { if (probeOn) lensEl.style.display = "block"; });
overviewBtn.addEventListener("click", () => setProbeMode(false));
probeBtn.addEventListener("click", () => setProbeMode(true));
setProbeMode(false);

// ---------- 图层加载插槽 ----------
function addProjectLayers(map) {
    // 把你原有 addSource/addLayer 逻辑放这里
}
function applyTopMapMuting(map) {
    const layers = map.getStyle().layers || [];
    for (const l of layers) {
        if (!l.id) continue;
        if (l.type === "fill") {
            try { map.setPaintProperty(l.id, "fill-opacity", 0.15); } catch (err) {}
        }
        if (l.type === "line") {
            try { map.setPaintProperty(l.id, "line-opacity", 0.20); } catch (err) {}
        }
        if (l.type === "circle") {
            try { map.setPaintProperty(l.id, "circle-opacity", 0.20); } catch (err) {}
        }
    }
}

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
                                                                    <div style="font-weight:700;font-size:1.08em;margin-bottom:10px;">City Support for New Grocery Stores</div>
                                                                    <div class="legend-row"><span class="legend-chip" style="background:#e74c3c"></span><span class="legend-label"><b>Strong City Support</b></span></div>
                                                                    <div class="legend-desc">Zoning changes + tax incentives</div>
                                                                    <div class="legend-row"><span class="legend-chip" style="background:#8e44ad"></span><span class="legend-label"><b>Planning Support</b></span></div>
                                                                    <div class="legend-desc">Zoning flexibility only</div>
                                                                    <div class="legend-row"><span class="legend-chip" style="background:#4caf50"></span><span class="legend-label"><b>Financial Support</b></span></div>
                                                                    <div class="legend-desc">Tax incentives only</div>
                                                                    <div class="legend-note">📌 <b>Note:</b> These zones indicate where the City encourages supermarket development through planning and fiscal incentives.</div>
                                                                    <hr style="margin:18px 0 10px 0;">
                                                                    <div style="font-weight:700;font-size:1.08em;margin-bottom:10px;">Truck Routes</div>
                                                                    <div class="legend-row"><span class="legend-line legend-dashed"></span><span class="legend-label">Truck Route (dashed)</span></div>
                                                                    <div class="legend-row"><span class="legend-line legend-solid"></span><span class="legend-label">Non-Truck Route (solid)</span></div>
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
                `Borough: ${f.properties.boroname || 'N/A'}<br>` +
                `Route Type: ${f.properties.routetype || 'N/A'}<br>` +
                `Truck Route: ${f.properties.truckroute === 'Y' ? 'Yes (dashed)' : 'No (solid)'}`;
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
