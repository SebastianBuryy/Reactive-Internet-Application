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

// Google Places Autocomplete Data endpoint
app.get('/api/autocomplete', async (req, res) => {
    try {
        const { input } = req.query;

        if (!input) {
            return res.status(400).json({ error: 'Input parameter is required' });
        }

        const url = 'https://places.googleapis.com/v1/places:autocomplete';

        const requestBody = {
            input: input,
            includedPrimaryTypes: ['locality', 'administrative_area_level_1'], // Filter for cities and administrative areas only
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': googleMapsApiKey,
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Autocomplete error:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

// Google Place Details endpoint
app.get('/api/places-details', async (req, res) => {
    try {
        const { placeId } = req.query;

        if (!placeId) {
            return res.status(400).json({ error: 'placeId parameter is required' });
        }

        const url = `https://places.googleapis.com/v1/places/${placeId}?fields=location,displayName`; // Extract name and longitude/latitude

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': googleMapsApiKey,
            },
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Place details error:', error);
        res.status(500).json({ error: 'Failed to fetch place details' });
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
