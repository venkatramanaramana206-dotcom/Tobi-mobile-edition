"""Maps spoken text to command handlers. First matching route wins."""
from typing import Callable

from .commands import apps, media_edit, music, time_date, weather, web
from .secure_store import delete_api_key, ensure_api_key

Handler = Callable[[str], str]


def _reset_key(_text: str) -> str:
    delete_api_key()
    ensure_api_key()
    return "Your new API key is saved."


ROUTES: list[tuple[tuple[str, ...], Handler]] = [
    (("reset api key", "change api key"), _reset_key),
    (("youtube",), web.youtube_search),
    (("weather", "temperature", "forecast"), weather.weather_report),
    (("what time", "current time", "tell me the time"), time_date.tell_time),
    (("date", "today"), time_date.tell_date),
    (("grayscale", "black and white"), media_edit.grayscale_photos),
    (("blur photo", "blur image"), media_edit.blur_photos),
    (("resize photo", "resize image"), media_edit.resize_photos),
    (("rotate photo", "rotate image"), media_edit.rotate_photos),
    (("trim video",), media_edit.trim_videos),
    (("compress video",), media_edit.compress_videos),
    (("next song", "next track"), music.next_track),
    (("previous song", "previous track"), music.previous_track),
    (("volume", "mute"), music.volume),
    (("pause", "play music", "play song", "resume music", "stop music"), music.play_pause),
    (("open ", "launch ", "start "), apps.open_app),
    (("search", "google"), web.browser_search),
]


def route(text: str) -> str | None:
    for keywords, handler in ROUTES:
        if any(k in text for k in keywords):
            return handler(text)
    return None
