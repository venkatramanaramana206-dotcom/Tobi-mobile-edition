"""Stores the API key in the OS keychain (Windows Credential Locker,
macOS Keychain, Linux Secret Service). The key is never written to disk
in plain text and is asked for only once."""
import getpass

import keyring
from keyring.errors import KeyringError

from .config import KEYRING_SERVICE, KEYRING_USER
from .errors import ZPIError


def get_api_key() -> str | None:
    try:
        return keyring.get_password(KEYRING_SERVICE, KEYRING_USER)
    except KeyringError as exc:
        raise ZPIError("I could not access the secure key storage.") from exc


def save_api_key(key: str) -> None:
    try:
        keyring.set_password(KEYRING_SERVICE, KEYRING_USER, key.strip())
    except KeyringError as exc:
        raise ZPIError("I could not save the API key securely.") from exc


def delete_api_key() -> None:
    try:
        keyring.delete_password(KEYRING_SERVICE, KEYRING_USER)
    except KeyringError:
        pass


def ensure_api_key() -> str:
    """Ask for the OpenWeatherMap key on first launch only."""
    key = get_api_key()
    if key:
        return key
    print("First launch: enter your OpenWeatherMap API key.")
    print("(Free key: https://openweathermap.org/api) Input is hidden.")
    while True:
        key = getpass.getpass("API key: ").strip()
        if key:
            save_api_key(key)
            print("Saved securely. You will not be asked again.")
            return key
        print("Key cannot be empty.")
