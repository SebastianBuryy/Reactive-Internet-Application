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

// Weather Forecast (Next 5 days) endpoint
app.get('/api/weather', async (req, res) => {
    try {
        const { lat, lon } = req.query;

        console.log("Received weather request for:", lat, lon);

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and Longitude parameters are required' });
        }

        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
        const data = await response.json();

        console.log("Weather data fetched:", data);

        res.json(data);
    } catch (error) {
        console.error('Error fetching weather forecast data:', error);
        res.status(500).json({ error: 'Failed to fetch weather forecast data' });
    }
});
