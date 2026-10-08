import './style.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://weather-information-app-b3vp.onrender.com').replace(/\/$/, '');
const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const HISTORY_KEY = 'weather-information-history-v1';

const state = { unit: localStorage.getItem('weather-unit') || 'c', data: null };

const $ = (id) => document.getElementById(id);
const searchForm = $('searchForm');
const cityInput = $('cityInput');
const message = $('message');
const suggestions = $('suggestions');
let suggestionTimer = null;
let suggestionController = null;
let suggestionItems = [];
let activeSuggestion = -1;

function setMessage(text = '', type = '') {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function clearSuggestions() {
  suggestionItems = [];
  activeSuggestion = -1;
  suggestions.innerHTML = '';
  suggestions.classList.remove('open');
}

function renderSuggestions(results) {
  suggestionItems = results;
  activeSuggestion = -1;
  if (!results.length) { clearSuggestions(); return; }
  suggestions.innerHTML = results.map(function(place, index) {
    const details = [place.admin1, place.country].filter(Boolean).join(', ');
    return '<button type="button" class="suggestion-item" data-index="' + index + '" role="option" aria-selected="false">' +
      '<span class="suggestion-name">' + escapeHtml(place.name) + '</span>' +
      '<span class="suggestion-meta">' + escapeHtml(details) + '</span>' +
      '</button>';
  }).join('');
  suggestions.classList.add('open');
  suggestions.querySelectorAll('.suggestion-item').forEach(function(button) {
    button.addEventListener('mousedown', function(event) {
      event.preventDefault();
      selectSuggestion(Number(button.dataset.index));
    });
  });
}

function selectSuggestion(index) {
  const place = suggestionItems[index];
  if (!place) return;
  cityInput.value = place.name;
  clearSuggestions();
  search(place.name);
}

async function fetchLocationSuggestions(query) {
  if (query.length < 3) { clearSuggestions(); return; }
  if (suggestionController) suggestionController.abort();
  suggestionController = new AbortController();
  try {
    const params = new URLSearchParams({ name: query, count: '5', language: 'en', format: 'json' });
    const response = await fetch(OPEN_METEO_GEOCODING_URL + '?' + params.toString(), { signal: suggestionController.signal });
    const payload = await response.json().catch(function() { return null; });
    if (!response.ok || !Array.isArray(payload?.results)) { clearSuggestions(); return; }
    renderSuggestions(payload.results);
  } catch (error) {
    if (error.name !== 'AbortError') clearSuggestions();
  }
}

function scheduleSuggestions() {
  window.clearTimeout(suggestionTimer);
  suggestionTimer = window.setTimeout(function() {
    fetchLocationSuggestions(cityInput.value.trim());
  }, 260);
}
function unitSymbol() {
  return state.unit === 'f' ? '°F' : '°C';
}

function formatNumber(value) {
  return Number.isInteger(value) ? value : value.toFixed(1);
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`));
}

function history() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}

function saveHistory(city) {
  const items = history().filter((item) => item.city.toLowerCase() !== city.toLowerCase());
  items.unshift({ city, time: new Date().toISOString() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 6)));
  renderHistory();
}

function renderHistory() {
  const container = $('history');
  const items = history();
  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = '<p class="empty-history">Your recent searches will appear here.</p>';
    return;
  }
  for (const item of items) {
    const button = document.createElement('button');
    button.className = 'history-item';
    button.type = 'button';
    button.innerHTML = `<span>↗ ${escapeHtml(item.city)}</span><small>${relativeTime(item.time)}</small>`;
    button.addEventListener('click', () => search(item.city));
    container.appendChild(button);
  }
}

function relativeTime(value) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day ago`;
}


function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function conditionFor(code) {
  switch (code) {
    case 0: return 'Clear sky';
    case 1:
    case 2: return 'Partly cloudy';
    case 3: return 'Overcast';
    case 45:
    case 48: return 'Foggy';
    case 51:
    case 53:
    case 55:
    case 56:
    case 57: return 'Drizzle';
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
    case 80:
    case 81:
    case 82: return 'Rain';
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86: return 'Snow';
    case 95:
    case 96:
    case 99: return 'Thunderstorm';
    default: return 'Unknown conditions';
  }
}

function weatherSvg(kind, extraClass = '') {
  const className = `weather-icon ${extraClass}`.trim();
  const common = `class="${className}" viewBox="0 0 96 96" aria-hidden="true" focusable="false"`;

  const sun = `
    <circle cx="32" cy="32" r="13" fill="none" stroke="currentColor" stroke-width="4"/>
    <g stroke="currentColor" stroke-width="4" stroke-linecap="round">
      <path d="M32 7v9"/><path d="M32 48v9"/><path d="M7 32h9"/><path d="M48 32h9"/>
      <path d="m14.3 14.3 6.4 6.4"/><path d="m43.3 43.3 6.4 6.4"/>
      <path d="m49.7 14.3-6.4 6.4"/><path d="m20.7 43.3-6.4 6.4"/>
    </g>`;

  const cloud = `
    <path d="M23 66h48a15 15 0 0 0 0-30 22 22 0 0 0-42-4A17 17 0 0 0 23 66Z"
      fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
  `;

  const rain = `
    <g stroke="currentColor" stroke-width="4" stroke-linecap="round">
      <path d="m30 74-5 10"/><path d="m48 74-5 10"/><path d="m66 74-5 10"/>
    </g>
  `;

  const snow = `
    <g stroke="currentColor" stroke-width="3.2" stroke-linecap="round">
      <path d="M30 74v14"/><path d="m24 77 12 8"/><path d="m36 77-12 8"/>
      <path d="M48 74v14"/><path d="m42 77 12 8"/><path d="m54 77-12 8"/>
      <path d="M66 74v14"/><path d="m60 77 12 8"/><path d="m72 77-12 8"/>
    </g>
  `;

  const fog = `
    <g stroke="currentColor" stroke-width="4" stroke-linecap="round">
      <path d="M20 70h56"/><path d="M28 80h40"/>
    </g>
  `;

  const bolt = `
    <path d="m52 69-10 16h11l-5 11 18-22H55l7-11Z"
      fill="currentColor"/>
  `;

  switch (kind) {
    case 'clear':
      return `<svg ${common}>${sun}</svg>`;
    case 'partly':
      return `<svg ${common}>${sun}<g transform="translate(14 17) scale(.78)">${cloud}</g></svg>`;
    case 'cloudy':
      return `<svg ${common}>${cloud}</svg>`;
    case 'fog':
      return `<svg ${common}>${cloud}${fog}</svg>`;
    case 'drizzle':
      return `<svg ${common}>${cloud}${rain}</svg>`;
    case 'rain':
      return `<svg ${common}>${cloud}${rain}</svg>`;
    case 'snow':
      return `<svg ${common}>${cloud}${snow}</svg>`;
    case 'storm':
      return `<svg ${common}>${cloud}${bolt}${rain}</svg>`;
    default:
      return `<svg ${common}>${sun}${cloud}</svg>`;
  }
}

function iconFor(code, size = '') {
  switch (code) {
    case 0: return weatherSvg('clear', size);
    case 1:
    case 2: return weatherSvg('partly', size);
    case 3: return weatherSvg('cloudy', size);
    case 45:
    case 48: return weatherSvg('fog', size);
    case 51:
    case 53:
    case 55:
    case 56:
    case 57: return weatherSvg('drizzle', size);
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
    case 80:
    case 81:
    case 82: return weatherSvg('rain', size);
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86: return weatherSvg('snow', size);
    case 95:
    case 96:
    case 99: return weatherSvg('storm', size);
    default: return weatherSvg('partly', size);
  }
}

async function fetchOpenMeteoWeather(city) {
  const geocodingParams = new URLSearchParams({
    name: city,
    count: '1',
    language: 'en',
    format: 'json'
  });

  const geocodingResponse = await fetch(
    OPEN_METEO_GEOCODING_URL + '?' + geocodingParams.toString()
  );
  const geocodingPayload = await geocodingResponse.json().catch(() => null);

  if (!geocodingResponse.ok) {
    throw new Error(geocodingPayload?.reason || 'Unable to find that city.');
  }

  const location = geocodingPayload?.results?.[0];
  if (!location) {
    throw new Error('City not found.');
  }

  const forecastParams = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,pressure_msl,wind_speed_10m,visibility,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    temperature_unit: state.unit === 'f' ? 'fahrenheit' : 'celsius',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
    forecast_days: '5'
  });

  const forecastResponse = await fetch(
    OPEN_METEO_FORECAST_URL + '?' + forecastParams.toString()
  );
  const forecastPayload = await forecastResponse.json().catch(() => null);

  if (!forecastResponse.ok || forecastPayload?.error) {
    throw new Error(forecastPayload?.reason || 'Unable to retrieve weather data.');
  }

  const current = forecastPayload.current;
  const daily = forecastPayload.daily;

  return {
    location: {
      name: location.name || city,
      country: location.country || '',
      admin1: location.admin1 || '',
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: forecastPayload.timezone || ''
    },
    current: {
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      pressure: current.pressure_msl,
      visibility: current.visibility / 1000,
      precipitation: current.precipitation,
      weatherCode: current.weather_code,
      day: current.is_day === 1,
      condition: conditionFor(current.weather_code),
      icon: iconFor(current.weather_code)
    },
    forecast: daily.time.map((date, index) => {
      const code = daily.weather_code[index];
      return {
        date,
        weatherCode: code,
        maxTemperature: daily.temperature_2m_max[index],
        minTemperature: daily.temperature_2m_min[index],
        precipitationProbability: daily.precipitation_probability_max[index],
        condition: conditionFor(code),
        icon: iconFor(code)
      };
    }),
    source: 'Open-Meteo'
  };
}

function render(data) {
  state.data = data;
  const { location, current, forecast } = data;
  $('locationName').textContent = location.name;
  $('locationMeta').textContent = [location.admin1, location.country].filter(Boolean).join(', ');
  $('updatedAt').textContent = `Updated ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date())}`;
  $('currentIcon').innerHTML = current.icon;
  $('temperature').textContent = formatNumber(current.temperature);
  $('temperatureUnit').textContent = unitSymbol();
  $('condition').textContent = current.condition;
  $('feelsLike').textContent = `Feels like ${formatNumber(current.feelsLike)}${unitSymbol()}`;
  $('humidity').textContent = current.humidity;
  $('wind').textContent = formatNumber(current.windSpeed);
  $('pressure').textContent = formatNumber(current.pressure);
  $('visibility').textContent = formatNumber(current.visibility);
  $('timezone').textContent = location.timezone.replaceAll('_', ' ');
  $('unitToggle').textContent = unitSymbol();

  $('forecast').innerHTML = forecast.map((day, index) => `
    <article class="forecast-card ${index === 0 ? 'today' : ''}">
      <span>${index === 0 ? 'Today' : formatDate(day.date)}</span>
      <strong class="forecast-icon">${day.icon}</strong>
      <b>${formatNumber(day.maxTemperature)} / ${formatNumber(day.minTemperature)}${unitSymbol()}</b>
      <small>${day.precipitationProbability}% rain</small>
    </article>
  `).join('');

  document.body.dataset.day = current.day ? 'day' : 'night';
}

async function search(city) {
  const trimmed = city.trim();
  clearSuggestions();
  if (!trimmed) return;
  cityInput.value = trimmed;
  setMessage('Loading weather data…', 'loading');
  $('weatherPanel').classList.add('loading');

  try {
    let payload = null;
    let backendError = null;

    if (API_BASE_URL) {
      try {
        const response = await fetch(
          API_BASE_URL + '/api/weather?city=' + encodeURIComponent(trimmed) + '&unit=' + state.unit
        );
        const backendPayload = await response.json().catch(() => null);

        if (response.ok) {
          payload = backendPayload;
        } else {
          backendError = backendPayload?.message || 'Backend request failed with HTTP ' + response.status + '.';
        }
      } catch (error) {
        backendError = error.message || 'Backend request failed.';
      }
    }

    if (!payload) {
      payload = await fetchOpenMeteoWeather(trimmed);
      setMessage('Weather data loaded.', 'success');
    } else {
      setMessage('Weather data loaded.', 'success');
    }

    render(payload);
    saveHistory(payload.location.name);
  } catch (error) {
    setMessage(error.message || 'Something went wrong. Please try again.', 'error');
  } finally {
    $('weatherPanel').classList.remove('loading');
  }
}

cityInput.addEventListener('input', scheduleSuggestions);

cityInput.addEventListener('keydown', (event) => {
  if (!suggestions.classList.contains('open')) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeSuggestion = Math.min(activeSuggestion + 1, suggestionItems.length - 1);
    updateActiveSuggestion();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeSuggestion = Math.max(activeSuggestion - 1, 0);
    updateActiveSuggestion();
  } else if (event.key === 'Enter' && activeSuggestion >= 0) {
    event.preventDefault();
    selectSuggestion(activeSuggestion);
  } else if (event.key === 'Escape') {
    clearSuggestions();
  }
});

cityInput.addEventListener('focus', () => {
  if (cityInput.value.trim().length >= 3) scheduleSuggestions();
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.search-box')) clearSuggestions();
});

function updateActiveSuggestion() {
  suggestions.querySelectorAll('.suggestion-item').forEach((button, index) => {
    const active = index === activeSuggestion;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (activeSuggestion >= 0) {
    selectSuggestion(activeSuggestion);
    return;
  }
  search(cityInput.value);
}

$('unitToggle').addEventListener('click', () => {
  state.unit = state.unit === 'c' ? 'f' : 'c';
  localStorage.setItem('weather-unit', state.unit);
  $('unitToggle').textContent = unitSymbol();
  if (state.data) search(state.data.location.name);
});

$('clearHistory').addEventListener('click', () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  setMessage('Recent searches cleared.', 'success');
});

renderHistory();
search('Manila');
