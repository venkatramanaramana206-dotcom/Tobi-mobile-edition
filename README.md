# ZPI Voice Assistant

A cross-platform (Windows / macOS / Linux) Python voice assistant.

## Features
- Voice commands + text-to-speech
- Time and date
- Open installed apps ("open calculator", "open chrome")
- Music play / pause / next / previous / volume (system media keys)
- Weather report (OpenWeatherMap) – "weather in Hyderabad"
- YouTube search – "youtube search lofi music"
- Browser search – "search python tutorials"
- Photo editing: grayscale, blur, resize, rotate
- Video editing: trim first 10s, compress (needs FFmpeg)
- Errors are spoken aloud and logged to `zpi.log`
- API key asked **once** on first launch, stored in the OS keychain
  (`keyring`), never saved in files. Say "reset API key" to change it.

## Project structure
```
zpi-voice-assistant/
├── main.py
├── requirements.txt
├── .gitignore
├── README.md
├── zpi/
│   ├── config.py        settings (language, city, folders)
│   ├── secure_store.py  API key in OS keychain
│   ├── speech.py        TTS + speech recognition
│   ├── errors.py        spoken-safe errors
│   ├── router.py        command routing
│   └── commands/
│       ├── time_date.py
│       ├── apps.py
│       ├── music.py
│       ├── weather.py
│       ├── web.py
│       └── media_edit.py
└── tests/test_router.py
```

## Build / run
```bash
git clone <your-repo-url> && cd zpi-voice-assistant
python -m venv .venv
# Windows: .venv\Scripts\activate     macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Platform notes
- **PyAudio**: Windows `pip install pyaudio`; macOS `brew install portaudio`;
  Linux `sudo apt install portaudio19-dev python3-pyaudio`.
- **Linux TTS**: `sudo apt install espeak`.
- **Video editing**: install FFmpeg (https://ffmpeg.org).
- Speech recognition uses Google's free web recognizer (internet needed).

## Config (environment variables)
`ZPI_LANGUAGE` (e.g. `te-IN` for Telugu, default `en-IN`), `ZPI_CITY`,
`ZPI_WAKE=1` (require wake word "ZPI"), `ZPI_MEDIA` (media folder).

## Media editing
Put files in `~/ZPI_Media/input`, say e.g. "grayscale photos" or
"compress video"; results appear in `~/ZPI_Media/output`.

## Tests
`pytest`

## Build executable (optional)
```bash
pip install pyinstaller
pyinstaller --onefile main.py
```
