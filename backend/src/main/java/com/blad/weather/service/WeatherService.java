package com.blad.weather.service;

import com.blad.weather.model.WeatherResponse;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
public class WeatherService {
    private static final Logger log = LoggerFactory.getLogger(WeatherService.class);

    private final RestClient client;

    public WeatherService() {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(20));

        this.client = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }

    public WeatherResponse getWeather(String city, String unit) {
        if (city == null || city.isBlank()) {
            throw new IllegalArgumentException("City is required.");
        }

        String normalizedUnit = "f".equalsIgnoreCase(unit) ? "fahrenheit" : "celsius";
        String trimmedCity = city.trim();

        JsonNode location = geocode(trimmedCity);
        if (location == null) {
            throw new IllegalArgumentException("City not found.");
        }

        double latitude = location.path("latitude").asDouble();
        double longitude = location.path("longitude").asDouble();

        String url = UriComponentsBuilder.fromUriString("https://api.open-meteo.com/v1/forecast")
                .queryParam("latitude", latitude)
                .queryParam("longitude", longitude)
                .queryParam("current",
                        "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation," +
                        "weather_code,pressure_msl,wind_speed_10m,visibility,is_day")
                .queryParam("daily",
                        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max")
                .queryParam("temperature_unit", normalizedUnit)
                .queryParam("wind_speed_unit", "kmh")
                .queryParam("timezone", "auto")
                .queryParam("forecast_days", 5)
                .build()
                .toUriString();

        JsonNode root = getJson(url, "forecast");
        if (root == null || root.path("current").isMissingNode() || root.path("daily").isMissingNode()) {
            log.error("Open-Meteo returned an incomplete forecast response for city={}", trimmedCity);
            throw new IllegalStateException("Weather service returned an incomplete response.");
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

        String displayName = location.path("name").asText(trimmedCity);

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
                .build()
                .toUriString();

        JsonNode root = getJson(url, "geocoding");
        JsonNode results = root == null ? null : root.path("results");

        return results != null && results.isArray() && !results.isEmpty()
                ? results.get(0)
                : null;
    }

    private JsonNode getJson(String url, String operation) {
        try {
            log.info("Requesting Open-Meteo {} endpoint", operation);

            JsonNode response = client.get()
                    .uri(url)
                    .header("Accept", "application/json")
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null) {
                log.error("Open-Meteo {} endpoint returned an empty response", operation);
                throw new IllegalStateException("Weather service returned an empty response.");
            }

            if (response.path("error").asBoolean(false)) {
                String reason = response.path("reason").asText("Unknown Open-Meteo error");
                log.error("Open-Meteo {} endpoint returned an API error: {}", operation, reason);
                throw new IllegalStateException("Open-Meteo error: " + reason);
            }

            return response;
        } catch (RestClientResponseException ex) {
            log.error(
                    "Open-Meteo {} request failed: HTTP {} response={}",
                    operation,
                    ex.getStatusCode().value(),
                    ex.getResponseBodyAsString(),
                    ex
            );
            throw new IllegalStateException("Unable to retrieve weather data from Open-Meteo.", ex);
        } catch (RestClientException ex) {
            log.error("Open-Meteo {} request failed: {}", operation, ex.getMessage(), ex);
            throw new IllegalStateException("Unable to connect to Open-Meteo.", ex);
        }
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
