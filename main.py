"""ZPI Voice Assistant entry point."""
import logging

from zpi.config import LOG_FILE, REQUIRE_WAKE_WORD, WAKE_WORD
from zpi.errors import ZPIError
from zpi.router import route
from zpi.secure_store import ensure_api_key
from zpi.speech import listen, speak

logging.basicConfig(filename=LOG_FILE, level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("zpi")

EXIT_WORDS = ("exit", "quit", "goodbye", "stop assistant")


def main() -> None:
    try:
        ensure_api_key()  # asked only on first launch
    except ZPIError as exc:
        speak(exc.user_message)
    speak("Hello, I am ZPI. How can I help you?")

    while True:
        try:
            text = listen()
            if not text:
                continue
            if REQUIRE_WAKE_WORD:
                if WAKE_WORD not in text:
                    continue
                text = text.replace(WAKE_WORD, "", 1).strip()
            if any(w in text for w in EXIT_WORDS):
                speak("Goodbye!")
                break
            reply = route(text)
            speak(reply or "Sorry, I did not understand that command.")
        except ZPIError as exc:
            log.warning("Handled error: %s", exc)
            speak(exc.user_message)
        except KeyboardInterrupt:
            speak("Goodbye!")
            break
        except Exception:
            log.exception("Unexpected error")
            speak("Sorry, something went wrong. Please check the log file.")


if __name__ == "__main__":
    main()
