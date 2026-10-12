# ZPI Voice Assistant – Mobile Edition

A voice assistant that runs **in your phone's browser** (Chrome on Android) and
installs like an app (PWA). No Python, no server – hosted free on GitHub Pages.

## Features
- Voice commands (English / తెలుగు / हिन्दी) + text-to-speech replies
- Time and date
- Open installed Android apps: "open whatsapp", "open camera", "open settings"
- Music player (your own songs): play / pause / next / previous / volume up / down
- Weather (OpenWeatherMap): "weather in Hyderabad"
- YouTube search: "youtube search lofi music"
- Browser search: "search python tutorials"
- Photo editing: grayscale, blur, sepia, brighten, rotate, resize, save photo
- Video editing: trim first 10 seconds, compress
- Errors are spoken aloud and shown on screen
- Weather API key asked **once** on first launch, stored AES-GCM encrypted
  (non-extractable key in IndexedDB). Say "reset API key" or tap 🔑 to change it.

## Project structure
```
index.html        UI
manifest.json     PWA install info
sw.js             offline cache
css/style.css
js/main.js        mic loop + UI wiring
js/speech.js      speech recognition + TTS
js/commands.js    command routing and handlers
js/media.js       music, photo, video
js/secure.js      encrypted API key storage
js/ui.js          log + API key dialog
icons/            app icons
```

## Deploy (GitHub Pages)
1. Upload ALL files and folders in this project to the **root** of your repo
   (delete the old Python files if you like).
2. Repo → **Settings → Pages** → Source: *Deploy from a branch* →
   Branch: `main`, folder `/ (root)` → Save.
3. Open `https://<username>.github.io/<repo>/` in **Chrome on Android**.
4. Allow the microphone. Menu ⋮ → **Add to Home screen** to install.

## Usage
Tap 🎤 and speak (tap again to stop). Pick files with 🎵 Music, 🖼️ Photo,
🎬 Video first, then give voice commands. Edited files appear as download links.

## Limits (browser rules, not bugs)
- Needs HTTPS (GitHub Pages is) and internet for speech recognition.
- Opening apps/links uses Android intents; if Chrome blocks an automatic
  launch, tap the link that appears in the chat.
- Web pages cannot control other apps' music; the built-in player is used.
- Opening YouTube/search leaves the page, so the mic stops – tap 🎤 again.
- Video trim/compress records playback in real time, so it takes as long as the video.
- iPhone Safari has limited voice-recognition support; use Android Chrome.
- A new OpenWeatherMap key can take up to ~2 hours to activate.

## Get a weather key
https://openweathermap.org/api (free plan is enough).
