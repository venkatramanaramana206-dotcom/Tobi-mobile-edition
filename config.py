"""Central configuration. Override with environment variables if needed."""
import os
from pathlib import Path

APP_NAME = "ZPI"
KEYRING_SERVICE = "zpi-voice-assistant"
KEYRING_USER = "openweather_api_key"

# Speech recognition language: "en-IN", "en-US", "te-IN" (Telugu), "hi-IN" ...
LANGUAGE = os.getenv("ZPI_LANGUAGE", "en-IN")
DEFAULT_CITY = os.getenv("ZPI_CITY", "Hyderabad")

# If True, commands must start with the wake word, e.g. "ZPI what is the time"
WAKE_WORD = "zpi"
REQUIRE_WAKE_WORD = os.getenv("ZPI_WAKE", "0") == "1"

SPEECH_RATE = 170
LOG_FILE = Path(os.getenv("ZPI_LOG", "zpi.log"))

MEDIA_DIR = Path(os.getenv("ZPI_MEDIA", Path.home() / "ZPI_Media"))
MEDIA_IN = MEDIA_DIR / "input"
MEDIA_OUT = MEDIA_DIR / "output"
