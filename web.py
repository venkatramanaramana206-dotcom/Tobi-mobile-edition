import re
import webbrowser
from urllib.parse import quote_plus

from ..errors import ZPIError


def _query(text: str, *strip_words: str) -> str:
    pattern = r"\b(" + "|".join(strip_words) + r")\b"
    return re.sub(pattern, "", text).strip()


def youtube_search(text: str) -> str:
    q = _query(text, "youtube", "search", "for", "on", "play", "open", "find")
    if not q:
        raise ZPIError("What should I search on YouTube?")
    webbrowser.open(f"https://www.youtube.com/results?search_query={quote_plus(q)}")
    return f"Searching YouTube for {q}"


def browser_search(text: str) -> str:
    q = _query(text, "google", "search", "for", "on", "the", "web", "browser", "internet")
    if not q:
        raise ZPIError("What should I search for?")
    webbrowser.open(f"https://www.google.com/search?q={quote_plus(q)}")
    return f"Searching for {q}"
