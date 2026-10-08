package com.blad.weather.model;

import java.util.List;

public record WeatherResponse(
        Location location,
        Current current,
        List<DailyForecast> forecast,
        String source
) {
    public record Location(
            String name,
            String country,
            String admin1,
            double latitude,
            double longitude,
            String timezone
    ) {}

    public record Current(
            double temperature,
            double feelsLike,
            int humidity,
            double windSpeed,
            double pressure,
            double visibility,
            double precipitation,
            int weatherCode,
            boolean day,
            String condition,
            String icon
    ) {}

    public record DailyForecast(
            String date,
            int weatherCode,
            double maxTemperature,
            double minTemperature,
            int precipitationProbability,
            String condition,
            String icon
    ) {}
}
