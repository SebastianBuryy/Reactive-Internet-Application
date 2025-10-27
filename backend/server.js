require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

const apiKey = process.env.OPENWEATHER_API_KEY;
const googleMapsApiKey = process.env.GOOGLEMAPSPLATFORM_API_KEY;

// Google Autocomplete endpoint
app.get('/api/places/autocomplete', async (req, res) => {
    try {
        const { input } = req.query;

        if (!input || input.length < 2) {
            return res.json({ predictions: [] });
        }

        const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
        url.searchParams.append('input', input);
        url.searchParams.append('types', '(cities)');
        url.searchParams.append('key', googleMapsApiKey);

        const response = await fetch(url);
        const data = await response.json();

        res.json(data);
    } catch (error) {
        console.error('Autocomplete error:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

// Google Place details endpoint
app.get('/api/places/details', async (req, res) => {
    try {
        const { place_id } = req.query;

        const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
        url.searchParams.append('place_id', place_id);
        url.searchParams.append('fields', 'name,geometry,formatted_address');
        url.searchParams.append('key', googleMapsApiKey);

        const response = await fetch(url);
        const data = await response.json();

        res.json(data);
    } catch (error) {
        console.error('Place details error:', error);
        res.status(500).json({ error: 'Failed to fetch place details' });
    }
});

// Geocoding API endpoint
app.get('/api/geocode', async (req, res) => {
    try {
        const { city } = req.query;

        console.log("Received geocode request for city:", city);

        if (!city) {
            return res.status(400).json({ error: 'City parameter is required' });
        }

        const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=5&appid=${apiKey}`);
        const data = await response.json();

        console.log("Geocode data fetched:", data);

        res.json(data);
    } catch (error) {
        console.error('Error fetching geocode data:', error);
        res.status(500).json({ error: 'Failed to fetch geocode data' });
    }
});

// Weather Forecast endpoint
app.get('/api/weather', async (req, res) => {
    try {
        const { lat, lon } = req.query;

        console.log("Received weather request for:", lat, lon);

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and Longitude parameters are required' });
        }

        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
        const data = await response.json();

        // Filter data to include today + next 3 days (4 days total)
        const currentDate = new Date();
        const fourDaysLater = new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000);

        const filteredData = data.list.filter(item => {
            const forecastDate = new Date(item.dt * 1000);
            return forecastDate >= currentDate && forecastDate <= fourDaysLater;
        });

        res.json({
            ...data,
            list: filteredData,
            cnt: filteredData.length
        })

        console.log("Weather data fetched:", data);

    } catch (error) {
        console.error('Error fetching weather forecast data:', error);
        res.status(500).json({ error: 'Failed to fetch weather forecast data' });
    }
});

// Air Pollution endpoint
app.get('/api/air_pollution', async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and Longitude parameters are required' });
        }

        const response = await fetch(`http://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`);
        const data = await response.json();

        res.json(data);
    } catch (error) {
        console.error('Error fetching air pollution data:', error);
        res.status(500).json({ error: 'Failed to fetch air pollution data' });
    }
});

// Map tile proxy endpoint
app.get('/api/map-tile/:layer/:z/:x/:y', async (req, res) => {
    try {
        const { layer, z, x, y } = req.params;

        // Validate layer name
        const validLayers = ['temp_new', 'precipitation_new', 'clouds_new', 'wind_new', 'pressure_new'];
        if (!validLayers.includes(layer)) {
            return res.status(400).json({ error: 'Invalid layer' });
        }

        // Fetch tile from OpenWeather
        const tileUrl = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${apiKey}`;
        const response = await fetch(tileUrl);

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch tile' });
        }

        // Get image as buffer
        const imageBuffer = await response.arrayBuffer();

        // Set proper headers for PNG image
        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

        // Send the tile image
        res.send(Buffer.from(imageBuffer));

    } catch (error) {
        console.error('Error fetching map tile:', error);
        res.status(500).json({ error: 'Failed to fetch map tile' });
    }
});
