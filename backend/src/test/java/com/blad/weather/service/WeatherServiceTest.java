package com.blad.weather.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class WeatherServiceTest {
    @Test
    void mapsWeatherCodesToReadableConditions() {
        assertEquals("Clear sky", WeatherService.conditionFor(0));
        assertEquals("Partly cloudy", WeatherService.conditionFor(2));
        assertEquals("Rain", WeatherService.conditionFor(63));
        assertEquals("Thunderstorm", WeatherService.conditionFor(95));
    }

    @Test
    void mapsWeatherCodesToIcons() {
        assertEquals("☀️", WeatherService.iconFor(0));
        assertEquals("🌧️", WeatherService.iconFor(65));
        assertEquals("⛈️", WeatherService.iconFor(99));
    }
}
