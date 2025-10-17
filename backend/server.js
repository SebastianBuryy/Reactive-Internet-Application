require('dotenv').config();

const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

const apiKey = process.env.OPENWEATHER_API_KEY

// Geocoding API endpoint
app.get('/api/geocode', async (req, res) => {
    try {
        const city = 'London'
        const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=5&appid=${apiKey}`)
        const data = await response.json()
        res.json(data)
    } catch (error) {
        console.error('Error fetching geocode data:', error)
        res.status(500).json({ error: 'Failed to fetch geocode data' })
    }
})
