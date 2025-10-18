// const { createApp } = Vue;

// createApp({
//     data() {
//         return {
//             searchQuery: '',
//             suggestions: [],
//             selectedCity: null,
//             weatherData: null,
//             searchTimeout: null,
//             // Processed weather info
//             needsUmbrella: false,
//             tempCategory: '',
//             threeDayForecast: []
//         };
//     },
//     methods: {
//         formatCityDisplay(city) {
//             if (city.state && city.state == city.name) {
//                 return `${city.name}, ${city.country}`;
//             }
//             else if (!city.state) {
//                 return `${city.name}, ${city.country}`;
//             }
//             return `${city.name}, ${city.state}, ${city.country}`;
//         },
//         getCities() {
//             clearTimeout(this.searchTimeout);

//             if (this.searchQuery.length < 2) {
//                 this.suggestions = [];
//                 return;
//             }

//             // Wait 300ms after the user stops typing to make the API call
//             this.searchTimeout = setTimeout(async () => {
//                 try {
//                     const encodedQuery = encodeURIComponent(this.searchQuery);
//                     const response = await fetch(`http://localhost:3000/api/geocode?city=${encodedQuery}`);
//                     const data = await response.json();

//                     // Remove duplicates based on name, state, and country
//                     const uniqueCities = [];
//                     const seen = new Set();

//                     for (const city of data) {
//                         const key = `${city.name}-${city.state || ''}-${city.country}`;
//                         if (!seen.has(key)) {
//                             seen.add(key);
//                             uniqueCities.push(city);
//                         }
//                     }

//                     this.suggestions = uniqueCities;

//                 } catch (error) {
//                     console.error("Error fetching city data:", error);
//                 }
//             }, 300);
//         },
//         async selectCity(city) {
//             this.selectedCity = city;
//             this.searchQuery = this.formatCityDisplay(city);
//             this.suggestions = [];
//             await this.getWeather(city.lat, city.lon);
//         },
//         async getWeather(lat, lon) {
//             try {
//                 const response = await fetch(`http://localhost:3000/api/weather?lat=${lat}&lon=${lon}`);
//                 this.weatherData = await response.json();
//                 this.processWeatherData();
//             } catch (error) {
//                 console.error("Error fetching weather data:", error);
//             }
//         },
//         processWeatherData() {
//             if (!this.weatherData || !this.weatherData.list) return;

//             // Get forecasts for next 3 days only
//             const now = new Date();
//             const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));

//             const next3Days = this.weatherData.list.filter(item => {
//                 const forecastDate = new Date(item.dt * 1000);
//                 return forecastDate >= now && forecastDate <= threeDaysFromNow;
//             });

//             // Check if umbrella is needed (any rain in next 3 days)
//             this.needsUmbrella = next3Days.some(item => item.rain);

//             // Find temperature range for packing recommendation
//             const temps = next3Days.map(item => item.main.temp);
//             const minTemp = Math.min(...temps);
//             const maxTemp = Math.max(...temps);

//             // Determine temperature category based on the range
//             if (maxTemp < 8) {
//                 this.tempCategory = 'Cold';
//             } else if (minTemp > 24) {
//                 this.tempCategory = 'Hot';
//             } else if (minTemp < 8 && maxTemp > 24) {
//                 this.tempCategory = 'Cold and Hot'; // Pack for both
//             } else if (minTemp < 8) {
//                 this.tempCategory = 'Cold and Mild';
//             } else if (maxTemp > 24) {
//                 this.tempCategory = 'Mild and Hot';
//             } else {
//                 this.tempCategory = 'Mild';
//             }

//             // Group by day for the summary table
//             this.threeDayForecast = this.groupByDay(next3Days);
//         },

//         groupByDay(forecasts) {
//             const days = {};

//             forecasts.forEach(item => {
//                 const date = new Date(item.dt * 1000);
//                 const dayKey = date.toLocaleDateString('en-GB', {
//                     weekday: 'short',
//                     year: 'numeric',
//                     month: 'short',
//                     day: 'numeric'
//                 });

//                 if (!days[dayKey]) {
//                     days[dayKey] = {
//                         date: dayKey,
//                         temps: [],
//                         windSpeeds: [],
//                         rainfall: 0
//                     };
//                 }

//                 days[dayKey].temps.push(item.main.temp);
//                 days[dayKey].windSpeeds.push(item.wind.speed);
//                 if (item.rain && item.rain['3h']) {
//                     days[dayKey].rainfall += item.rain['3h'];
//                 }
//             });

//             // Calculate averages and format
//             return Object.values(days).map(day => ({
//                 date: day.date,
//                 minTemp: Math.round(Math.min(...day.temps)),
//                 maxTemp: Math.round(Math.max(...day.temps)),
//                 avgWindSpeed: (day.windSpeeds.reduce((a, b) => a + b, 0) / day.windSpeeds.length).toFixed(1),
//                 totalRainfall: day.rainfall.toFixed(1)
//             }));
//         },
//     },
// }).mount('#app');

const { createApp } = Vue;

createApp({
    data() {
        return {
            searchQuery: '',
            suggestions: [],
            selectedCity: null,
            weatherData: null,
            searchTimeout: null,
            // Processed weather info
            needsUmbrella: false,
            tempCategory: '',
            threeDayForecast: [],
            currentWeather: null,
            temperatureChart: [],
            rainfallChart: []
        };
    },
    methods: {
        formatCityDisplay(city) {
            if (city.state && city.state == city.name) {
                return `${city.name}, ${city.country}`;
            }
            else if (!city.state) {
                return `${city.name}, ${city.country}`;
            }
            return `${city.name}, ${city.state}, ${city.country}`;
        },
        getCities() {
            clearTimeout(this.searchTimeout);

            if (this.searchQuery.length < 2) {
                this.suggestions = [];
                return;
            }

            // Wait 300ms after the user stops typing to make the API call
            this.searchTimeout = setTimeout(async () => {
                try {
                    const encodedQuery = encodeURIComponent(this.searchQuery);
                    const response = await fetch(`http://localhost:3000/api/geocode?city=${encodedQuery}`);
                    const data = await response.json();

                    // Remove duplicates based on name, state, and country
                    const uniqueCities = [];
                    const seen = new Set();

                    for (const city of data) {
                        const key = `${city.name}-${city.state || ''}-${city.country}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            uniqueCities.push(city);
                        }
                    }

                    this.suggestions = uniqueCities;

                } catch (error) {
                    console.error("Error fetching city data:", error);
                }
            }, 300);
        },
        async selectCity(city) {
            this.selectedCity = city;
            this.searchQuery = this.formatCityDisplay(city);
            this.suggestions = [];
            await this.getWeather(city.lat, city.lon);
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

            // Get forecasts for next 3 days
            const now = new Date();
            const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));

            const next3Days = this.weatherData.list.filter(item => {
                const forecastDate = new Date(item.dt * 1000);
                return forecastDate >= now && forecastDate <= threeDaysFromNow;
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
            this.prepareChartData(next3Days);
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
                        hour: '2-digit'
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
        }
    },
}).mount('#app');