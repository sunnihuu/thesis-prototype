// Mapbox access token provided by user
mapboxgl.accessToken = 'pk.eyJ1Ijoic3VubmlodSIsImEiOiJjbWQ2bDBwNzcwMThwMm9weTVjc2JuNG90In0.sVXA1xGrFWnG-1ZV_EyO1w';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11', // Light gray style
    center: [-73.935242, 40.730610], // Centered to cover Manhattan, Queens, Bronx
    zoom: 11.5
});
// Add navigation controls
map.addControl(new mapboxgl.NavigationControl());
