"""Control whatever media player is active using system media keys."""
from ..errors import ZPIError


def _press(key: str) -> None:
    try:
        import pyautogui
        pyautogui.press(key)
    except Exception as exc:
        raise ZPIError("I could not control the media player.") from exc


def play_pause(text: str) -> str:
    _press("playpause")
    return "Pausing music" if "pause" in text or "stop" in text else "Playing music"


def next_track(_text: str) -> str:
    _press("nexttrack")
    return "Next song"


def previous_track(_text: str) -> str:
    _press("prevtrack")
    return "Previous song"


def volume(text: str) -> str:
    if "mute" in text:
        _press("volumemute")
        return "Muted"
    key = "volumeup" if ("up" in text or "increase" in text) else "volumedown"
    for _ in range(5):
        _press(key)
    return "Volume changed"
