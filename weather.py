import re

import requests

from ..config import DEFAULT_CITY
from ..errors import ZPIError
from ..secure_store import get_api_key

URL = "https://api.openweathermap.org/data/2.5/weather"


def weather_report(text: str) -> str:
    match = re.search(r"(?:in|at|for)\s+([a-z .]+)$", text)
    city = match.group(1).strip() if match else DEFAULT_CITY
    key = get_api_key()
    if not key:
        raise ZPIError("No weather API key is saved. Say reset API key to add one.")
    try:
        resp = requests.get(URL, params={"q": city, "appid": key, "units": "metric"}, timeout=10)
    except requests.RequestException as exc:
        raise ZPIError("I could not reach the weather service. Check your internet.") from exc
    if resp.status_code == 401:
        raise ZPIError("Your weather API key is invalid. Say reset API key to change it.")
    if resp.status_code == 404:
        raise ZPIError(f"I could not find the city {city}.")
    if not resp.ok:
        raise ZPIError("The weather service returned an error.")
    data = resp.json()
    desc = data["weather"][0]["description"]
    temp = round(data["main"]["temp"])
    feels = round(data["main"]["feels_like"])
    humidity = data["main"]["humidity"]
    return (f"In {city.title()}, it is {temp} degrees Celsius with {desc}. "
            f"Feels like {feels}. Humidity is {humidity} percent.")
