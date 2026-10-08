package com.blad.weather.service;

import com.blad.weather.model.WeatherResponse;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.List;

@Service
public class WeatherService {
    private final RestClient client = RestClient.builder().build();

    public WeatherResponse getWeather(String city, String unit) {
        if (city == null || city.isBlank()) {
            throw new IllegalArgumentException("City is required.");
        }
        String normalizedUnit = "f".equalsIgnoreCase(unit) ? "fahrenheit" : "celsius";
        JsonNode location = geocode(city.trim());
        if (location == null) {
            throw new IllegalArgumentException("City not found.");
        }

        double latitude = location.path("latitude").asDouble();
        double longitude = location.path("longitude").asDouble();

        String url = UriComponentsBuilder.fromUriString("https://api.open-meteo.com/v1/forecast")
                .queryParam("latitude", latitude)
                .queryParam("longitude", longitude)
                .queryParam("current", "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,pressure_msl,wind_speed_10m,visibility,is_day")
                .queryParam("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max")
                .queryParam("temperature_unit", normalizedUnit)
                .queryParam("wind_speed_unit", "kmh")
                .queryParam("timezone", "auto")
                .queryParam("forecast_days", 5)
                .toUriString();

        JsonNode root = client.get().uri(url).retrieve().body(JsonNode.class);
        if (root == null || root.path("current").isMissingNode()) {
            throw new IllegalStateException("Weather service returned an invalid response.");
        }

        JsonNode current = root.path("current");
        String timezone = root.path("timezone").asText("");
        String condition = conditionFor(current.path("weather_code").asInt());
        boolean day = current.path("is_day").asInt(1) == 1;

        List<WeatherResponse.DailyForecast> forecast = new ArrayList<>();
        JsonNode daily = root.path("daily");
        JsonNode dates = daily.path("time");
        for (int i = 0; i < dates.size(); i++) {
            int code = daily.path("weather_code").path(i).asInt();
            forecast.add(new WeatherResponse.DailyForecast(
                    dates.path(i).asText(),
                    code,
                    daily.path("temperature_2m_max").path(i).asDouble(),
                    daily.path("temperature_2m_min").path(i).asDouble(),
                    daily.path("precipitation_probability_max").path(i).asInt(),
                    conditionFor(code),
                    iconFor(code)
            ));
        }

        String displayName = location.path("name").asText(city.trim());
        return new WeatherResponse(
                new WeatherResponse.Location(
                        displayName,
                        location.path("country").asText(""),
                        location.path("admin1").asText(""),
                        latitude,
                        longitude,
                        timezone
                ),
                new WeatherResponse.Current(
                        current.path("temperature_2m").asDouble(),
                        current.path("apparent_temperature").asDouble(),
                        current.path("relative_humidity_2m").asInt(),
                        current.path("wind_speed_10m").asDouble(),
                        current.path("pressure_msl").asDouble(),
                        current.path("visibility").asDouble() / 1000.0,
                        current.path("precipitation").asDouble(),
                        current.path("weather_code").asInt(),
                        day,
                        condition,
                        iconFor(current.path("weather_code").asInt())
                ),
                forecast,
                "Open-Meteo"
        );
    }

    private JsonNode geocode(String city) {
        String url = UriComponentsBuilder.fromUriString("https://geocoding-api.open-meteo.com/v1/search")
                .queryParam("name", city)
                .queryParam("count", 1)
                .queryParam("language", "en")
                .queryParam("format", "json")
                .toUriString();
        JsonNode root = client.get().uri(url).retrieve().body(JsonNode.class);
        JsonNode results = root == null ? null : root.path("results");
        return results != null && results.isArray() && !results.isEmpty() ? results.get(0) : null;
    }

    public static String conditionFor(int code) {
        return switch (code) {
            case 0 -> "Clear sky";
            case 1, 2 -> "Partly cloudy";
            case 3 -> "Overcast";
            case 45, 48 -> "Foggy";
            case 51, 53, 55, 56, 57 -> "Drizzle";
            case 61, 63, 65, 66, 67, 80, 81, 82 -> "Rain";
            case 71, 73, 75, 77, 85, 86 -> "Snow";
            case 95, 96, 99 -> "Thunderstorm";
            default -> "Unknown conditions";
        };
    }

    public static String iconFor(int code) {
        return switch (code) {
            case 0 -> "☀️";
            case 1, 2 -> "⛅";
            case 3 -> "☁️";
            case 45, 48 -> "🌫️";
            case 51, 53, 55, 56, 57 -> "🌦️";
            case 61, 63, 65, 66, 67, 80, 81, 82 -> "🌧️";
            case 71, 73, 75, 77, 85, 86 -> "❄️";
            case 95, 96, 99 -> "⛈️";
            default -> "🌤️";
        };
    }
}
