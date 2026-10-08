# Weather Information App

A full-stack recreation and extension of a University of the People **CS 1103 Programming 2** weather application. The repository preserves the academic Java Swing implementation and adds a deployable web version using Java, Spring Boot, JavaScript, Vite, and Open-Meteo.

## Features

- Search weather by city
- Current temperature and feels-like temperature
- Humidity, wind speed, pressure, visibility, and precipitation
- Five-day forecast
- Celsius/Fahrenheit switching
- Recent-search history stored in the browser
- Day/night presentation
- Loading and error states
- REST API with CORS configuration
- Health endpoint for deployment monitoring
- Unit tests and GitHub Actions build verification
- No weather API key exposed in the public web frontend

## Project Structure

```text
weather-information-app/
├── backend/                 # Spring Boot REST API
├── docs/                    # API, portfolio, and project documentation
├── java-desktop/            # Academic Java Swing implementation
├── screenshots/             # Portfolio screenshots
├── web-app/                 # Vite frontend
├── .github/workflows/       # CI build and test verification
├── render.yaml              # Render backend configuration
├── .gitignore
├── LICENSE
└── README.md
```

## Implementations

### Java Desktop — Academic Version

Located in `/java-desktop`.

- Java 21
- Java Swing
- Weatherstack current-weather API
- `org.json`
- Celsius/Fahrenheit selection
- Search history
- Error handling
- Day/night presentation
- Weatherstack API key loaded from the `WEATHERSTACK_API_KEY` environment variable

Run locally:

```bash
cd java-desktop
export WEATHERSTACK_API_KEY="YOUR_KEY"
mvn compile exec:java
```

On Windows PowerShell:

```powershell
$env:WEATHERSTACK_API_KEY="YOUR_KEY"
mvn compile exec:java
```

Never commit the API key.

### Full-Stack Web Version — Portfolio Version

The web version is divided into a frontend and backend:

**Frontend — `/web-app`**
- Vite
- HTML, CSS, JavaScript
- Responsive UI
- Celsius/Fahrenheit switching
- Five-day forecast
- Recent-search history with localStorage
- Loading and error states

**Backend — `/backend`**
- Java 21
- Spring Boot
- REST API
- Open-Meteo geocoding
- Open-Meteo forecast API
- CORS configuration
- JSON response mapping
- Actuator health endpoint
- Unit tests

The public web version uses Open-Meteo through the backend, so a weather-service API key is not required by the browser.

## Architecture

```text
┌──────────────────────────────┐
│        Vite Web App          │
│     Vercel / Browser         │
└──────────────┬───────────────┘
               │
               │ GET /api/weather
               ▼
┌──────────────────────────────┐
│      Spring Boot API         │
│       Render / Java 21       │
└──────────────┬───────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
┌──────────────┐ ┌──────────────┐
│ Open-Meteo   │ │ Open-Meteo   │
│ Geocoding    │ │ Forecast API │
└──────────────┘ └──────────────┘
```

## Local Development

### 1. Start the backend

Requirements: Java 21 and Maven.

```bash
cd backend
mvn spring-boot:run
```

The API runs on:

```text
http://localhost:8080
```

Example:

```text
http://localhost:8080/api/weather?city=Manila&unit=c
```

Health check:

```text
http://localhost:8080/actuator/health
```

### 2. Start the frontend

Requirements: Node.js 20.19+.

```bash
cd web-app
cp .env.example .env.local
npm install
npm run dev
```

The frontend normally runs at:

```text
http://localhost:5173
```

The local environment file contains:

```text
VITE_API_BASE_URL=http://localhost:8080
```

### 3. Run backend tests

```bash
cd backend
mvn test
```

### 4. Build the frontend

```bash
cd web-app
npm install
npm run build
```

The production files are generated in `web-app/dist`.

## Deployment

### Backend — Render

Create a Render Web Service from this repository.

Use:

- Root Directory: `backend`
- Runtime: Docker
- Dockerfile: `./Dockerfile`
- Health Check Path: `/actuator/health`
- Environment variable:

```text
ALLOWED_ORIGINS=https://YOUR-VERCEL-DOMAIN.vercel.app
```

The included `render.yaml` contains the backend service configuration.

After deployment, verify:

```text
https://YOUR-RENDER-SERVICE.onrender.com/actuator/health
```

### Frontend — Vercel

Import the same GitHub repository into Vercel.

Use:

- Root Directory: `web-app`
- Framework Preset: Vite
- Node.js: 20.19+ or newer
- Environment variable:

```text
VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com
```

The included `vercel.json` provides SPA routing.

After deployment, update Render's `ALLOWED_ORIGINS` value to the exact Vercel production domain.

## CI Verification

GitHub Actions runs automatically on pushes and pull requests to `main`.

The workflow verifies:

1. Backend Maven tests with Java 21.
2. Frontend dependency installation.
3. Frontend production build.

This helps prevent a broken backend or frontend from being merged into the main branch.

## API

See [docs/API.md](docs/API.md) for the REST endpoint and response structure.

### GET /api/weather

Parameters:

- `city` — required city name
- `unit` — optional `c` or `f`; defaults to Celsius

Example:

```text
/api/weather?city=Manila&unit=c
```

### GET /api/health

Returns a simple application health message.

## Security

- API keys are loaded from environment variables.
- Environment files are ignored by Git.
- The frontend does not contain a Weatherstack API key.
- The web frontend communicates with the backend rather than directly exposing a protected weather API.
- CORS origins are configured through the backend environment.

Do not commit credentials, tokens, or production environment files.

## Academic Context

This repository distinguishes the original academic implementation from the portfolio extension.

The Java Swing application preserves the core CS 1103 Programming 2 requirements. The web application recreates those concepts as a modern full-stack project with a separate REST backend and deployable frontend.

## Portfolio

See [docs/PORTFOLIO.md](docs/PORTFOLIO.md) for the recommended portfolio description and screenshot checklist.

## References

- University of the People CS 1103 Programming 2 assignment — original project brief supplied with this repository.
- Weatherstack documentation: https://docs.apilayer.com/weatherstack/docs/getting-started
- Open-Meteo documentation: https://open-meteo.com/en/docs
- Spring Boot: https://spring.io/projects/spring-boot
- Vite: https://vite.dev/
- Vercel Vite deployment: https://vercel.com/docs/frameworks/frontend/vite
- Render Web Services: https://render.com/docs/web-services
