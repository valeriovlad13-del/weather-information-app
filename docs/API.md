# API Reference

## GET /api/health

Returns a simple service health message.

## GET /api/weather

Query parameters:

- `city` — required city name
- `unit` — optional `c` or `f`; defaults to Celsius

Example:

```text
/api/weather?city=Manila&unit=c
```

Response structure:

```json
{
  "location": {
    "name": "Manila",
    "country": "Philippines",
    "admin1": "Metro Manila",
    "latitude": 14.6,
    "longitude": 120.98,
    "timezone": "Asia/Manila"
  },
  "current": {
    "temperature": 30.2,
    "feelsLike": 34.1,
    "humidity": 72,
    "windSpeed": 10.4,
    "pressure": 1009.5,
    "visibility": 10,
    "precipitation": 0,
    "weatherCode": 2,
    "day": true,
    "condition": "Partly cloudy",
    "icon": "⛅"
  },
  "forecast": [],
  "source": "Open-Meteo"
}
```
