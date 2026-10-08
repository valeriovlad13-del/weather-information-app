# Java Desktop Version

This is the academic Java Swing implementation recreated from the CS 1103 Programming 2 activity.

## Run

Set your own Weatherstack key as an environment variable:

```bash
export WEATHERSTACK_API_KEY="YOUR_KEY"
```

Then:

```bash
mvn compile exec:java
```

Never place the key directly in `WeatherApp.java` or commit it to Git.
