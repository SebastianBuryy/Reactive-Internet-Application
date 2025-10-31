# AuroraView - Weather Application

A weather dashboard application that provides forecasts, air quality alerts, packing recommendations, and interactive weather maps.

## Quickstart Guide

### Prerequisites

- Node.js
- npm
- API Keys: OpenWeatherMap, Google Maps Platform with Places API (New) enabled.

### Setup Instructions

**1. Install Dependencies**

```
   cd backend
   npm install
```

This will install the required packages:

- express
- cors
- dotenv

**2. Configure Environment Variables**

Create a `.env` file in the `backend` directory:

```
OPENWEATHER_API_KEY=your_openweathermap_api_key_here
GOOGLEMAPSPLATFORM_API_KEY=your_google_maps_api_key_here
```

Obtaining API Keys:

- OpenWeatherMap: Register at https://openweathermap.org/api
- Google Maps Platform:
  1.  Go to https://console.cloud.google.com/
  2.  Create a new project
  3.  Enable "Places API (New)"
  4.  Create credentials (API Key)

**3. Start the Backend Server**

From the `backend` directory:

```
  node server.js
```

The server will start on http://localhost:3000

**4. Open the Application**

Open `frontend/index.html` in a web browser, or use a local development server.

## Project Structure

```
├── backend/
│   ├── server.js           # Express backend server
│   ├── .env                # Environment variables (create this)
│   ├── package.json        # Node dependencies
│   └── node_modules/       # Installed dependencies
│
├── frontend/
│   ├── index.html          # Main HTML file
│   └── app.js              # Vue.js frontend application
│
└── README.md               # This file
```
