package com.blad.weather;

import org.json.JSONArray;
import org.json.JSONObject;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/** Academic desktop implementation based on the original CS 1103 activity. */
public class WeatherApp extends JFrame {
    private final JTextField cityInput = new JTextField(18);
    private final JTextArea weatherDisplay = new JTextArea(8, 35);
    private final JComboBox<String> unitSelector = new JComboBox<>(new String[]{"Celsius", "Fahrenheit"});
    private final DefaultListModel<String> historyListModel = new DefaultListModel<>();
    private final JLabel iconLabel = new JLabel("☀", SwingConstants.CENTER);
    private final JPanel backgroundPanel = new JPanel(new BorderLayout(10, 10));
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public WeatherApp() {
        setTitle("Weather Information App — CS 1103");
        setSize(620, 620);
        setMinimumSize(new Dimension(520, 540));
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);
        buildUi();
    }

    private void buildUi() {
        JPanel topPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 8));
        topPanel.setBorder(BorderFactory.createEmptyBorder(10, 10, 5, 10));
        topPanel.add(new JLabel("City:"));
        topPanel.add(cityInput);
        JButton searchButton = new JButton("Get Weather");
        topPanel.add(searchButton);
        topPanel.add(unitSelector);

        weatherDisplay.setEditable(false);
        weatherDisplay.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 15));
        weatherDisplay.setLineWrap(true);
        weatherDisplay.setWrapStyleWord(true);

        iconLabel.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 54));
        iconLabel.setBorder(BorderFactory.createEmptyBorder(12, 12, 0, 12));
        backgroundPanel.add(iconLabel, BorderLayout.NORTH);
        backgroundPanel.add(new JScrollPane(weatherDisplay), BorderLayout.CENTER);
        backgroundPanel.setBorder(BorderFactory.createEmptyBorder(0, 10, 10, 10));

        JList<String> historyList = new JList<>(historyListModel);
        historyList.setVisibleRowCount(4);
        JPanel historyPanel = new JPanel(new BorderLayout());
        historyPanel.setBorder(BorderFactory.createTitledBorder("Search History"));
        historyPanel.add(new JScrollPane(historyList), BorderLayout.CENTER);

        add(topPanel, BorderLayout.NORTH);
        add(backgroundPanel, BorderLayout.CENTER);
        add(historyPanel, BorderLayout.SOUTH);

        searchButton.addActionListener(this::handleSearch);
        cityInput.addActionListener(this::handleSearch);
    }

    private void handleSearch(ActionEvent ignored) { fetchWeather(); }

    private void fetchWeather() {
        String city = cityInput.getText().trim();
        if (city.isEmpty()) { showError("Please enter a city."); return; }

        String apiKey = System.getenv("WEATHERSTACK_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            showError("Set WEATHERSTACK_API_KEY before using the desktop version.");
            return;
        }

        String unit = unitSelector.getSelectedItem().toString().equals("Celsius") ? "m" : "f";
        String url = "https://api.weatherstack.com/current?access_key=" +
                URLEncoder.encode(apiKey, StandardCharsets.UTF_8) + "&query=" +
                URLEncoder.encode(city, StandardCharsets.UTF_8) + "&units=" + unit;

        weatherDisplay.setText("Loading weather data...");
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url)).GET().build();
            httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenAccept(response -> SwingUtilities.invokeLater(() -> processResponse(response.body())))
                    .exceptionally(error -> {
                        SwingUtilities.invokeLater(() -> showError("Failed to fetch weather data."));
                        return null;
                    });
        } catch (IllegalArgumentException exception) {
            showError("Invalid request.");
        }
    }

    private void processResponse(String body) {
        try {
            JSONObject data = new JSONObject(body);
            if (data.has("error")) { showError("City not found or API limit reached."); return; }
            displayWeather(data);
            String city = data.getJSONObject("location").optString("name", cityInput.getText().trim());
            historyListModel.addElement(city + " — " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMM d, h:mm a")));
            updateBackground(data);
        } catch (Exception exception) {
            showError("The weather response could not be processed.");
        }
    }

    private void displayWeather(JSONObject data) {
        JSONObject location = data.getJSONObject("location");
        JSONObject current = data.getJSONObject("current");
        JSONArray descriptions = current.optJSONArray("weather_descriptions");
        String description = descriptions != null && !descriptions.isEmpty() ? descriptions.getString(0) : "Unknown conditions";
        int temperature = current.optInt("temperature");
        int humidity = current.optInt("humidity");
        int wind = current.optInt("wind_speed");
        int pressure = current.optInt("pressure");
        int visibility = current.optInt("visibility");
        String unit = unitSelector.getSelectedItem().toString().equals("Celsius") ? "°C" : "°F";

        weatherDisplay.setText(String.format(
                "Location: %s, %s%n%nCondition: %s%nTemperature: %d%s%nFeels Like: %d%s%nHumidity: %d%%%nWind Speed: %d km/h%nPressure: %d hPa%nVisibility: %d km",
                location.optString("name", ""), location.optString("country", ""), description,
                temperature, unit, current.optInt("feelslike"), unit, humidity, wind, pressure, visibility));
        iconLabel.setText("☁");
    }

    private void updateBackground(JSONObject data) {
        String isDay = data.getJSONObject("current").optString("is_day", "yes");
        backgroundPanel.setBackground("yes".equalsIgnoreCase(isDay) ? new Color(225, 242, 255) : new Color(45, 52, 72));
    }

    private void showError(String message) {
        JOptionPane.showMessageDialog(this, message, "Weather App", JOptionPane.ERROR_MESSAGE);
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new WeatherApp().setVisible(true));
    }
}
