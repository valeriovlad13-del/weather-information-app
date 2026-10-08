import './style.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const HISTORY_KEY = 'weather-information-history-v1';

const state = { unit: localStorage.getItem('weather-unit') || 'c', data: null };

const $ = (id) => document.getElementById(id);
const searchForm = $('searchForm');
const cityInput = $('cityInput');
const message = $('message');

function setMessage(text = '', type = '') {
  message.textContent = text;
  message.className = `message ${type}`.trim();
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

function render(data) {
  state.data = data;
  const { location, current, forecast } = data;
  $('locationName').textContent = location.name;
  $('locationMeta').textContent = [location.admin1, location.country].filter(Boolean).join(', ');
  $('updatedAt').textContent = `Updated ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date())}`;
  $('currentIcon').textContent = current.icon;
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
      <strong>${day.icon}</strong>
      <b>${formatNumber(day.maxTemperature)} / ${formatNumber(day.minTemperature)}${unitSymbol()}</b>
      <small>${day.precipitationProbability}% rain</small>
    </article>
  `).join('');

  document.body.dataset.day = current.day ? 'day' : 'night';
}

async function search(city) {
  const trimmed = city.trim();
  if (!trimmed) return;
  cityInput.value = trimmed;
  setMessage('Loading weather data…', 'loading');
  $('weatherPanel').classList.add('loading');
  try {
    if (!API_BASE_URL) throw new Error('Weather API is not configured. Set VITE_API_BASE_URL in the deployment environment.');
    const response = await fetch(`${API_BASE_URL}/api/weather?city=${encodeURIComponent(trimmed)}&unit=${state.unit}`);
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || 'Unable to retrieve weather data.');
    render(payload);
    saveHistory(payload.location.name);
    setMessage('Weather data loaded.', 'success');
  } catch (error) {
    setMessage(error.message || 'Something went wrong. Please try again.', 'error');
  } finally {
    $('weatherPanel').classList.remove('loading');
  }
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  search(cityInput.value);
});

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
