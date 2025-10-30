const { createApp } = Vue;

createApp({
    data() {
        return {
            searchQuery: '',
            predictions: [],
            lat: null,
            lon: null,
            selectedCity: null,
            weatherData: null,
            searchTimeout: null,
            // Processed weather info
            needsUmbrella: false,
            tempCategory: '',
            threeDayForecast: [],
            currentWeather: null,
            temperatureChart: [],
            rainfallChart: [],
            airPollutionData: null,
            airQualityWarnings: [],
            overallAQI: null,
            // Map related
            map: null,
            weatherTileLayer: null,
            activeMapLayer: 'temp',
            mapLayers: [
                { id: 'temp', name: 'Temperature', icon: '🌡️', layer: 'temp_new' },
                { id: 'precipitation', name: 'Precipitation', icon: '🌧️', layer: 'precipitation_new' },
                { id: 'clouds', name: 'Clouds', icon: '☁️', layer: 'clouds_new' },
                { id: 'wind', name: 'Wind Speed', icon: '💨', layer: 'wind_new' },
                { id: 'pressure', name: 'Pressure', icon: '📊', layer: 'pressure_new' }
            ],
            cityMarker: null,
            showMapLegend: true,
        };
    },
    methods: {
        async getPredictions() {
            if (this.searchQuery.length < 2) {
                this.predictions = [];
                return;
            }

            try {
                const response = await fetch(`http://localhost:3000/api/autocomplete?input=${this.searchQuery}`);
                const data = await response.json();

                this.predictions = data.suggestions || [];
            } catch (error) {
                console.error('Error fetching predictions:', error);
                this.predictions = [];
            }
        },

        async selectPlace(prediction) {
            const placeId = prediction.placePrediction.placeId;

            this.searchQuery = prediction.placePrediction.text.text;
            this.selectedCity = prediction.placePrediction.text.text;
            this.predictions = [];

            try {
                const response = await fetch(`http://localhost:3000/api/places-details?placeId=${placeId}`);
                const data = await response.json();

                if (data && data.location) {
                    this.lat = data.location.latitude;
                    this.lon = data.location.longitude;

                    await this.getWeather(this.lat, this.lon);
                    await this.getAirPollution(this.lat, this.lon);
                    this.$nextTick(() => {
                        this.initialiseMap(this.lat, this.lon);
                    });
                }
            } catch (error) {
                console.error('Error fetching place details:', error);
                return;
            }

        },

        async getWeather(lat, lon) {
            try {
                const response = await fetch(`http://localhost:3000/api/weather?lat=${lat}&lon=${lon}`);
                this.weatherData = await response.json();
                this.processWeatherData();
            } catch (error) {
                console.error("Error fetching weather data:", error);
            }
        },
        async getAirPollution(lat, lon) {
            try {
                const response = await fetch(`http://localhost:3000/api/air_pollution?lat=${lat}&lon=${lon}`);
                this.airPollutionData = await response.json();
                this.processAirPollutionData();
            } catch (error) {
                console.error("Error fetching air pollution data:", error);
            }
        },
        processAirPollutionData() {
            if (!this.airPollutionData || !this.airPollutionData.list || this.airPollutionData.list.length === 0) return;

            this.airQualityWarnings = [];

            // Get the current/first air quality reading
            const currentAQ = this.airPollutionData.list[0];
            const aqi = currentAQ.main.aqi;
            const components = currentAQ.components;

            // AQI level descriptions
            const aqiLevels = {
                1: { level: 'Good', color: 'green' },
                2: { level: 'Fair', color: 'yellow' },
                3: { level: 'Moderate', color: 'orange' },
                4: { level: 'Poor', color: 'red' },
                5: { level: 'Very Poor', color: 'purple' }
            };

            // WHO Air Quality Guidelines - "Good" thresholds
            const thresholds = {
                pm2_5: { good: 10, pollutant: 'Particulate (PM2.5)', health: 'Can cause respiratory issues and heart disease.' },
                pm10: { good: 20, pollutant: 'Particulate (PM10)', health: 'Can irritate airways and worsen lung diseases.' },
                o3: { good: 60, pollutant: 'Ozone (O₃)', health: 'Can trigger coughing, throat irritation, and aggravates asthma or chronic lung conditions.' },
                no: { good: 40, pollutant: 'Nitrogen Monoxide (NO)', health: 'Can irritate airways and can impair lung function with prolonged exposure.' },
                nh3: { good: 180, pollutant: 'Ammonia (NH₃)', health: 'Can irritate the eyes, skin, and respiratory system.' },
                no2: { good: 40, pollutant: 'Nitrogen Dioxide (NO₂)', health: 'Can cause inflammation of the respiratory tract and worsens asthma and lung diseases.' },
                so2: { good: 20, pollutant: 'Sulfur Dioxide (SO₂)', health: 'Can cause shortness of breath and irritation of eyes, nose, and throat.' },
                co: { good: 4400, pollutant: 'Carbon Monoxide (CO)', health: 'Can reduce oxygen delivery in the body, leading to headaches, dizziness, or even impaired brain function.' }
            };

            // Check each pollutant
            for (const [key, threshold] of Object.entries(thresholds)) {
                const value = components[key];
                if (value > threshold.good) {
                    const exceedancePercent = Math.round(((value - threshold.good) / threshold.good) * 100);

                    // Determine severity
                    let severity = 'Moderate';
                    let severityColor = 'orange';
                    if (exceedancePercent > 100) {
                        severity = 'High';
                        severityColor = 'red';
                    } else if (exceedancePercent > 200) {
                        severity = 'Very High';
                        severityColor = 'purple';
                    }

                    this.airQualityWarnings.push({
                        pollutant: threshold.pollutant,
                        value: value.toFixed(2),
                        threshold: threshold.good,
                        exceedancePercent: exceedancePercent,
                        severity: severity,
                        severityColor: severityColor,
                        healthRisk: threshold.health
                    });
                }
            }

            // Store overall AQI info
            this.overallAQI = {
                level: aqi,
                description: aqiLevels[aqi].level,
                color: aqiLevels[aqi].color,
            };
        },
        processWeatherData() {
            if (!this.weatherData || !this.weatherData.list) return;

            // Get current weather (first item in the list)
            const firstItem = this.weatherData.list[0];
            this.currentWeather = {
                temp: Math.round(firstItem.main.temp),
                feelsLike: Math.round(firstItem.main.feels_like),
                description: firstItem.weather[0].description,
                icon: firstItem.weather[0].icon,
                humidity: firstItem.main.humidity,
                windSpeed: firstItem.wind.speed.toFixed(1),
                rainfall: firstItem.rain ? firstItem.rain['3h'] : 0,
                time: new Date(firstItem.dt * 1000)
            };

            // All data including today (for charts - 20th, 21st, 22nd, 23rd)
            const allData = this.weatherData.list;

            // Filter to exclude today for the forecast tables/cards (21st, 22nd, 23rd only)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const next3Days = this.weatherData.list.filter(item => {
                const forecastDate = new Date(item.dt * 1000);
                return forecastDate >= tomorrow;
            });

            // Check if umbrella is needed (any rain in next 3 days)
            this.needsUmbrella = next3Days.some(item => item.rain);

            // Find temperature range for packing recommendation
            const temps = next3Days.map(item => item.main.temp);
            const minTemp = Math.min(...temps);
            const maxTemp = Math.max(...temps);

            // Determine temperature category based on the range
            if (maxTemp < 8) {
                this.tempCategory = 'Cold';
            } else if (minTemp > 24) {
                this.tempCategory = 'Hot';
            } else if (minTemp < 8 && maxTemp > 24) {
                this.tempCategory = 'Cold and Hot';
            } else if (minTemp < 8) {
                this.tempCategory = 'Cold and Mild';
            } else if (maxTemp > 24) {
                this.tempCategory = 'Mild and Hot';
            } else {
                this.tempCategory = 'Mild';
            }

            // Group by day for the summary table and cards
            this.threeDayForecast = this.groupByDay(next3Days);

            // Prepare chart data
            this.prepareChartData(allData);
        },

        getTempRangeDescription() {
            const descriptions = {
                'Cold': '(below 8°C)',
                'Mild': '(8°C - 24°C)',
                'Hot': '(above 24°C)',
                'Cold and Mild': '(below 8°C to 24°C)',
                'Mild and Hot': '(8°C to above 24°C)',
                'Cold and Hot': '(varies widely: below 8°C to above 24°C)'
            };
            return descriptions[this.tempCategory] || '';
        },

        groupByDay(forecasts) {
            const days = {};

            forecasts.forEach(item => {
                const date = new Date(item.dt * 1000);
                const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

                if (!days[dayKey]) {
                    days[dayKey] = {
                        date: date,
                        displayDate: date.toLocaleDateString('en-GB', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        }),
                        temps: [],
                        feelsLike: [],
                        windSpeeds: [],
                        humidity: [],
                        rainfall: 0,
                        weatherIcons: [],
                        descriptions: []
                    };
                }

                days[dayKey].temps.push(item.main.temp);
                days[dayKey].feelsLike.push(item.main.feels_like);
                days[dayKey].windSpeeds.push(item.wind.speed);
                days[dayKey].humidity.push(item.main.humidity);
                days[dayKey].weatherIcons.push(item.weather[0].icon);
                days[dayKey].descriptions.push(item.weather[0].description);

                if (item.rain && item.rain['3h']) {
                    days[dayKey].rainfall += item.rain['3h'];
                }
            });

            // Calculate averages and format - limit to first 3 days
            return Object.values(days).slice(0, 3).map(day => {
                // Get most frequent weather icon/description (typically midday)
                const middleIndex = Math.floor(day.weatherIcons.length / 2);

                return {
                    date: day.displayDate,
                    minTemp: Math.round(Math.min(...day.temps)),
                    maxTemp: Math.round(Math.max(...day.temps)),
                    avgFeelsLike: Math.round(day.feelsLike.reduce((a, b) => a + b, 0) / day.feelsLike.length),
                    avgWindSpeed: (day.windSpeeds.reduce((a, b) => a + b, 0) / day.windSpeeds.length).toFixed(1),
                    avgHumidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
                    totalRainfall: day.rainfall.toFixed(1),
                    icon: day.weatherIcons[middleIndex],
                    description: day.descriptions[middleIndex]
                };
            });
        },

        prepareChartData(forecasts) {
            // Temperature chart data (every 6 hours for clarity)
            this.temperatureChart = forecasts
                .filter((_, index) => index % 2 === 0) // Every 6 hours
                .map(item => ({
                    time: new Date(item.dt * 1000).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        hour12: true,
                    }),
                    temp: Math.round(item.main.temp)
                }));

            // Rainfall chart data (daily totals)
            const dailyRainfall = {};
            forecasts.forEach(item => {
                const date = new Date(item.dt * 1000).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short'
                });

                if (!dailyRainfall[date]) {
                    dailyRainfall[date] = 0;
                }

                if (item.rain && item.rain['3h']) {
                    dailyRainfall[date] += item.rain['3h'];
                }
            });

            this.rainfallChart = Object.entries(dailyRainfall).map(([date, rainfall]) => ({
                date,
                rainfall: rainfall.toFixed(1)
            }));
        },

        getWeatherIconUrl(iconCode) {
            return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        },

        getTemperatureLinePoints() {
            if (!this.temperatureChart || this.temperatureChart.length === 0) return '';

            const chartWidth = 532; // w-full in SVG viewBox
            const chartHeight = 208; // h-64 = 16rem = 256px
            const bottomPadding = 8; // pb-6 = 1.5rem = 24px for labels
            const availableHeight = chartHeight - bottomPadding;

            const points = this.temperatureChart.map((point, index) => {
                const x = (index / (this.temperatureChart.length - 1)) * chartWidth;
                const y = availableHeight - (point.temp * 3);
                return `${x},${y}`;
            });

            return points.join(' ');
        },

        initialiseMap(lat, lon) {
            // If map doesn't exist, create it
            if (!this.map) {
                this.map = L.map('weather-map').setView([lat, lon], 6);

                // Add base map (OpenStreetMap)
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 18
                }).addTo(this.map);

                // Add weather overlay
                this.addWeatherLayer(this.activeMapLayer);
            } else {
                // Map exists, just update view
                this.map.setView([lat, lon], 6);
            }

            // Remove old marker if exists
            if (this.cityMarker) {
                this.map.removeLayer(this.cityMarker);
            }

            // Add city marker
            this.cityMarker = L.marker([lat, lon])
                .addTo(this.map)
                .bindPopup(`<b>${this.selectedCity}</b>`)
                .openPopup();
        },

        addWeatherLayer(layerId) {
            const layer = this.mapLayers.find(l => l.id === layerId);
            if (!layer) return;

            // Remove old weather layer if exists
            if (this.weatherTileLayer) {
                this.map.removeLayer(this.weatherTileLayer);
            }

            // Add new weather layer through backend proxy
            this.weatherTileLayer = L.tileLayer(
                `http://localhost:3000/api/map-tile/${layer.layer}/{z}/{x}/{y}`,
                {
                    attribution: '© OpenWeatherMap',
                    opacity: 1,
                    maxZoom: 18
                }
            ).addTo(this.map);
        },

        toggleMapLayer(layerId) {
            this.activeMapLayer = layerId;
            if (this.map) {
                this.addWeatherLayer(layerId);
            }
        },

        getActiveLegendTitle() {
            const layer = this.mapLayers.find(l => l.id === this.activeMapLayer);
            return layer ? layer.name + ' Scale' : 'Legend';
        },

        getActiveLegendHTML() {
            const legends = {
                'temp': `
                <div class="space-y-1 text-xs">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(252, 128, 20, 1)"></div>
                        <span>30°C+ (Hot)</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(255, 194, 40, 1)"></div>
                        <span>25°C</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(255, 240, 40, 1)"></div>
                        <span>20°C</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(194, 255, 40, 1)"></div>
                        <span>10°C</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(35, 221, 221, 1)"></div>
                        <span>0°C</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(32, 196, 232, 1)"></div>
                        <span>-10°C</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(32, 140, 236, 1)"></div>
                        <span>-20°C</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(130, 87, 219, 1)"></div>
                        <span>-30°C (Cold)</span>
                    </div>
                </div>
            `,
                'precipitation': `
                <div class="space-y-1 text-xs">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(20, 20, 255, 0.9)"></div>
                        <span>140mm+ (Heavy)</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(80, 80, 225, 0.7)"></div>
                        <span>10mm</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(110, 110, 205, 0.5)"></div>
                        <span>1mm</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(120, 120, 190, 0.3)"></div>
                        <span>0.5mm</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(150, 150, 170, 0.2)"></div>
                        <span>0.2mm</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(200, 150, 150, 0.1)"></div>
                        <span>0.1mm (Light)</span>
                    </div>
                </div>
            `,
                'clouds': `
                <div class="space-y-1 text-xs">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(240, 240, 255, 1)"></div>
                        <span>100% (Overcast)</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(244, 244, 255, 0.8)"></div>
                        <span>70%</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(247, 247, 255, 0.5)"></div>
                        <span>50%</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(250, 250, 255, 0.3)"></div>
                        <span>30%</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(253, 253, 255, 0.1)"></div>
                        <span>10% (Clear)</span>
                    </div>
                </div>
            `,
                'wind': `
                <div class="space-y-1 text-xs">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(13, 17, 38, 1)"></div>
                        <span>200+ m/s</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(70, 0, 175, 1)"></div>
                        <span>100 m/s</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(116, 76, 172, 0.9)"></div>
                        <span>50 m/s</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(63, 33, 59, 0.8)"></div>
                        <span>25 m/s</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(179, 100, 188, 0.7)"></div>
                        <span>15 m/s</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(238, 206, 206, 0.4)"></div>
                        <span>5 m/s (Light)</span>
                    </div>
                </div>
            `,
                'pressure': `
                <div class="space-y-1 text-xs">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(198, 0, 0, 1)"></div>
                        <span>1080+ hPa</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(243, 54, 59, 1)"></div>
                        <span>1060 hPa</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(251, 85, 21, 1)"></div>
                        <span>1040 hPa</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(240, 184, 0, 1)"></div>
                        <span>1020 hPa</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(176, 247, 32, 1)"></div>
                        <span>1010 hPa</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(141, 231, 199, 1)"></div>
                        <span>1000 hPa</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(75, 208, 214, 1)"></div>
                        <span>980 hPa</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(0, 170, 255, 1)"></div>
                        <span>960 hPa</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-4" style="background: rgba(0, 115, 255, 1)"></div>
                        <span>940 hPa (Low)</span>
                    </div>
                </div>
            `
            };

            return legends[this.activeMapLayer] || legends['temp'];
        }
    },
}).mount('#app');