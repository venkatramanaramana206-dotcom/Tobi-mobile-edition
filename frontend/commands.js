import { loadKey, saveKey, clearKey } from './secure.js';
import { log, askKey } from './ui.js';
import * as M from './media.js';

const has = (t, ...k) => k.some(x => t.includes(x));
const strip = (t, words) => t.replace(new RegExp('(' + words.join('|') + ')', 'g'), ' ').replace(/\s+/g, ' ').trim();

function go(url, label) {
  log(label, 'bot', url);
  if (!window.open(url, '_blank')) location.href = url;
}

/* ---- time / date ---- */
const time = () => 'The time is ' + new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const date = () => 'Today is ' + new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/* ---- open installed Android apps via intents ---- */
const PK = {
  whatsapp: 'com.whatsapp', youtube: 'com.google.android.youtube', instagram: 'com.instagram.android',
  facebook: 'com.facebook.katana', telegram: 'org.telegram.messenger', gmail: 'com.google.android.gm',
  maps: 'com.google.android.apps.maps', chrome: 'com.android.chrome', spotify: 'com.spotify.music',
  calculator: 'com.google.android.calculator', 'play store': 'com.android.vending',
  phonepe: 'com.phonepe.app', 'google pay': 'com.google.android.apps.nbu.paisa.user',
  photos: 'com.google.android.apps.photos', clock: 'com.google.android.deskclock',
};
function openApp(t) {
  const n = strip(t, ['please', 'open', 'launch', 'start', 'ఓపెన్', 'app', 'యాప్']);
  if (!n) throw new Error('I did not catch which app to open.');
  let url;
  if (n === 'camera') url = 'intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end';
  else if (n === 'settings') url = 'intent:#Intent;action=android.settings.SETTINGS;end';
  else {
    const p = PK[n];
    if (!p) throw new Error(`I don't know the app ${n}. I can open: ${Object.keys(PK).join(', ')}, camera, settings.`);
    const fb = encodeURIComponent('https://play.google.com/store/apps/details?id=' + p);
    url = `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${p};S.browser_fallback_url=${fb};end`;
  }
  log('Tap to open ' + n, 'bot', url);
  location.href = url;
  return 'Opening ' + n;
}

/* ---- weather ---- */
async function weather(t) {
  const m = t.match(/(?:in|at|for)\s+([a-z .]+)$/);
  const city = m ? m[1].trim() : (localStorage.zpi_city || 'Hyderabad');
  const key = await loadKey();
  if (!key) throw new Error('No weather API key saved. Tap the API key button to add one.');
  let r;
  try { r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=metric`); }
  catch { throw new Error('I could not reach the weather service. Check your internet.'); }
  if (r.status === 401) throw new Error('Your weather API key is invalid, or not active yet. Tap the API key button to change it.');
  if (r.status === 404) throw new Error('I could not find the city ' + city);
  if (!r.ok) throw new Error('The weather service returned an error.');
  const d = await r.json();
  return `In ${city}, it is ${Math.round(d.main.temp)} degrees Celsius with ${d.weather[0].description}. Feels like ${Math.round(d.main.feels_like)}. Humidity ${d.main.humidity} percent.`;
}

/* ---- web ---- */
function youtube(t) {
  const q = strip(t, ['youtube', 'యూట్యూబ్', 'search', 'for', 'on', 'play', 'open', 'find']);
  if (!q) throw new Error('What should I search on YouTube?');
  go('https://www.youtube.com/results?search_query=' + encodeURIComponent(q), 'Tap to open YouTube results');
  return 'Searching YouTube for ' + q;
}
function google(t) {
  const q = strip(t, ['google', 'search', 'for', 'on', 'the', 'web', 'browser', 'internet', 'వెతుకు']);
  if (!q) throw new Error('What should I search for?');
  go('https://www.google.com/search?q=' + encodeURIComponent(q), 'Tap to open search results');
  return 'Searching for ' + q;
}

async function resetKey() {
  clearKey();
  const k = await askKey();
  if (!k) return 'No key saved.';
  await saveKey(k);
  return 'Your new API key is saved.';
}

/* ---- routes: first match wins ---- */
const ROUTES = [
  [t => has(t, 'reset api key', 'change api key'), resetKey],
  [t => has(t, 'youtube', 'యూట్యూబ్'), youtube],
  [t => has(t, 'weather', 'temperature', 'forecast', 'వాతావరణం', 'వెదర్'), weather],
  [t => has(t, 'what time', 'current time', 'the time', 'సమయం', 'టైం'), time],
  [t => has(t, 'date', 'today', 'తేదీ', 'డేట్'), date],
  [t => has(t, 'grayscale', 'black and white'), M.photo.gray],
  [t => has(t, 'blur'), M.photo.blur],
  [t => has(t, 'sepia'), M.photo.sepia],
  [t => has(t, 'brighten', 'brightness'), M.photo.bright],
  [t => has(t, 'rotate'), M.photo.rotate],
  [t => has(t, 'resize'), M.photo.resize],
  [t => has(t, 'save photo', 'download photo'), M.photo.save],
  [t => has(t, 'trim video'), M.video.trim],
  [t => has(t, 'compress video'), M.video.compress],
  [t => has(t, 'next song', 'next track'), M.music.next],
  [t => has(t, 'previous song', 'previous track'), M.music.prev],
  [t => has(t, 'volume up', 'increase volume'), () => M.music.volume(true)],
  [t => has(t, 'volume down', 'decrease volume'), () => M.music.volume(false)],
  [t => has(t, 'pause', 'stop music'), M.music.pause],
  [t => has(t, 'play music', 'play song', 'resume', 'play'), M.music.play],
  [t => /^(please )?(open|launch|start|ఓపెన్)\b/.test(t), openApp],
  [t => has(t, 'search', 'google'), google],
];

export async function route(text) {
  for (const [match, fn] of ROUTES) if (match(text)) return await fn(text);
  return null;
}
