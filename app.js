// Your OpenRouteService API key
const apiKey = '5b3ce3597851110001cf6248e720abd372ef4e2e970381fe2f420b29'; // Replace with your actual API key

// Initialize the map and set its view to a default location (Kerala)
const map = L.map('map').setView([10.7295, 76.4752], 7); // Default view of Kerala

// Add OpenStreetMap tiles to the map  
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Global variable for storing the user's current location (origin)
let userLocation = [10.7295, 76.4752]; // Default to some location (will be updated with geolocation)

// Global variable to store route coordinates
let routeCoordsLatLng = []; // Store route coordinates globally
let currentRouteLayer = null; // Global variable to store the current route layer

// Array to store flood zone layers
let floodZones = [];

// Function to generate a random, **smaller** flood zone within Kerala's bounds
function generateRandomFloodZone() {
    // Randomly select a position within Kerala's geographic bounds
    const lat1 = 8.5 + (Math.random() * 3.5);  // Latitude range for Kerala (8.5°N to 12.0°N)
    const lon1 = 76 + (Math.random() * 1.5); // Longitude range for Kerala (76°E to 77.5°E)

    // Make the flood zones **smaller** by decreasing the latitude and longitude range
    const lat2 = lat1 + (0.1 + Math.random() * 0.2);  // Smaller vertical range
    const lon2 = lon1 + (0.1 + Math.random() * 0.2);  // Smaller horizontal range

    // Define a rectangular flood zone (smaller than before)
    const coordinates = [
        [lon1, lat1], // bottom-left
        [lon1, lat2], // top-left
        [lon2, lat2], // top-right
        [lon2, lat1], // bottom-right
        [lon1, lat1]  // close the polygon
    ];

    return {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates: [coordinates]
        },
        properties: {
            name: "Random Flood Zone",
            risk: "high"
        }
    };
}

// Function to add random flood zones to the map
function generateFloodZones() {
    // Clear the existing flood zones if any
    floodZones.forEach(layer => map.removeLayer(layer));  
    floodZones = [];

    // Generate 30 flood zones
    for (let i = 0; i < 30; i++) {
        const randomFloodZone = generateRandomFloodZone();
        const floodLayer = L.geoJSON(randomFloodZone, {
            style: {
                color: "red",
                weight: 2,
                opacity: 0.5,
                fillOpacity: 0.4
            },
            onEachFeature: function (feature, layer) {
                layer.bindPopup(`<b>${feature.properties.name}</b><br>Risk: ${feature.properties.risk}`);
            }
        }).addTo(map);

        floodZones.push(floodLayer);
    }

    console.log("Flood Zones Generated: ", floodZones.length); // Log to confirm zones are being added
    
    // Check route intersection after generating flood zones (only if route exists)
    if (routeCoordsLatLng.length > 0) {
        checkRouteIntersection(routeCoordsLatLng);
    }
}

// Add event listener to the button to generate random flood zones when clicked
document.getElementById('generateFloodZonesButton').addEventListener('click', function() {
    generateFloodZones();
});

// Function to get coordinates from address using Nominatim Geocoding API
function geocodeAddress(address, callback) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                callback([lat, lon]);
            } else {
                alert("Destination not found. Please try again.");
            }
        })
        .catch(error => {
            console.error("Geocoding error:", error);
            alert("Error geocoding the address.");
        });
}

// Function to get the route from origin to destination
function getRouteToDestination(destination) {
    // OpenRouteService API expects coordinates in the order: longitude, latitude (lng, lat)
    const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${apiKey}&start=${userLocation[1]},${userLocation[0]}&end=${destination[1]},${destination[0]}`;

    // Fetch the route from OpenRouteService API
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.features && data.features.length > 0) {
                const routeCoords = data.features[0].geometry.coordinates;

                // Convert route coordinates from [lng, lat] to [lat, lng] for Leaflet
                routeCoordsLatLng = routeCoords.map(coord => [coord[1], coord[0]]);

                // If there's an old route, remove it
                if (currentRouteLayer) {
                    map.removeLayer(currentRouteLayer);
                }

                // Display the new route on the map
                currentRouteLayer = L.polyline(routeCoordsLatLng, { color: 'blue' }).addTo(map);
                map.fitBounds(currentRouteLayer.getBounds());

                // Check for intersection with any flood zones
                checkRouteIntersection(routeCoordsLatLng);
            } else {
                alert("No route found.");
            }
        })
        .catch(error => {
            console.error("Error fetching route:", error);
            alert("Error fetching route.");
        });
}

// Function to check if the route intersects any flood zone
function checkRouteIntersection(routeCoordsLatLng) {
    const routeLine = L.polyline(routeCoordsLatLng); // Convert route coordinates to polyline
    
    let intersectionDetected = false; // Flag to track if an intersection has already been detected

    // Iterate over each flood zone and check for intersection
    floodZones.forEach(floodLayer => {
        floodLayer.eachLayer(function (floodPolygon) {
            // Use the leaflet-polygon-intersect plugin (or manually use contains method)
            if (routeLine.getBounds().intersects(floodPolygon.getBounds()) && !intersectionDetected) {
                // This is a basic bounding box check. If needed, use geometry checks for better accuracy.
                alert("Warning: Your route intersects with a flood zone!");
                console.log("Route intersects a flood zone!");
                
                intersectionDetected = true; // Set flag to true after the first alert
            }
        });
    });
}

// Function to get the user's current geolocation
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            // Get the user's coordinates
            userLocation = [position.coords.latitude, position.coords.longitude];

            // Add a marker for the user's location
            L.marker(userLocation).addTo(map).bindPopup("Your Location").openPopup();
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// Get user's current location on page load
getUserLocation();

// Event listener for calculating route based on destination input
document.getElementById('calculateRouteButton').addEventListener('click', function () {
    const destination = document.getElementById('destinationInput').value;
    if (destination) {
        geocodeAddress(destination, getRouteToDestination);
    }
});
