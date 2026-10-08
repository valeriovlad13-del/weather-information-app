# Weather Information App

A full-stack recreation of a University of the People **CS 1103 Programming 2** activity. The original activity describes a Java Swing weather application using the Weatherstack API, with GUI input, weather information, unit conversion, icons, search history, error handling, and day/night presentation. The submitted activity also includes a screenshot of a richer weather dashboard with a five-day forecast and recent searches.

This repository preserves the academic Java implementation while adding a modern browser-based portfolio version.

## Project Versions

### 1. Java Desktop — Academic Implementation

`/java-desktop`

- Java 21
- Java Swing
- Weatherstack current-weather API
- `org.json`
- Celsius/Fahrenheit selection
- Search history
- Error handling
- Day/night background
- API key loaded from `WEATHERSTACK_API_KEY` instead of being committed to source control

### 2. Full-Stack Web Version — Portfolio Implementation

`/web-app` + `/backend`

**Frontend**
- Vite
- HTML, CSS, JavaScript
- Responsive interface
- Celsius/Fahrenheit conversion
- Five-day forecast
- Search history using localStorage
- Loading and error states
- Day/night theme

**Backend**
- Java 21
- Spring Boot
- REST API
- CORS configuration
- Open-Meteo geocoding and forecast APIs
- JSON response mapping
- Health endpoint
- Unit tests

Open-Meteo is used by the deployed recreation so the public frontend does not expose a weather-service API key. The original Weatherstack-based Java implementation remains available for the academic context.

## Architecture

```text
Browser / Vercel
      |
      | GET /api/weather?city=...
      v
Spring Boot / Render
      |
      +--> Open-Meteo Geocoding API
      |
      +--> Open-Meteo Forecast API
```

## Local Development

### Backend

Requirements: Java 21 and Maven.

```bash
cd backend
mvn spring-boot:run
```

The API starts at `http://localhost:8080`.

Test it:

```text
http://localhost:8080/api/weather?city=Manila&unit=c
```

### Frontend

Requirements: Node.js 20+.

```bash
cd web-app
cp .env.example .env.local
npm install
npm run dev
```

Open the Vite development URL shown in the terminal, normally `http://localhost:5173`.

### Tests

```bash
cd backend
mvn test
```

## Deployment

### Backend — Render

Create a Render Web Service from this repository using:

- Root Directory: `backend`
- Runtime: Docker
- Dockerfile: `./Dockerfile`
- Health Check: `/actuator/health`
- Environment variable: `ALLOWED_ORIGINS=https://YOUR-VERCEL-DOMAIN.vercel.app`

Render automatically rebuilds and deploys when changes are pushed to the connected branch.

### Frontend — Vercel

Import the repository into Vercel and set:

- Root Directory: `web-app`
- Framework Preset: Vite
- Environment Variable: `VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com`

The included `vercel.json` supports SPA routing.

## Security Notes

Do not commit API keys, `.env` files, or credentials. The original assignment contained a Weatherstack access key in the source code; this recreation intentionally removes that practice. Weatherstack's documentation specifically advises keeping access keys private.

## Academic Context

The project is presented as a recreation and extension, not as a claim that the portfolio web version was the original submitted implementation. The Java Swing version represents the academic activity; the web version demonstrates how the same core requirements can be redesigned as a deployable full-stack application.

## References

- University of the People CS 1103 Programming 2 assignment — original project brief supplied with this repository.
- Weatherstack documentation: https://docs.apilayer.com/weatherstack/docs/getting-started
- Open-Meteo documentation: https://open-meteo.com/en/docs
- Spring Boot: https://spring.io/projects/spring-boot
- Vite: https://vite.dev/
- Vercel Vite deployment: https://vercel.com/docs/frameworks/frontend/vite
- Render Web Services: https://render.com/docs/web-services
