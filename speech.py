"""Text-to-speech and speech-to-text."""
import logging

import pyttsx3
import speech_recognition as sr

from .config import LANGUAGE, SPEECH_RATE

log = logging.getLogger(__name__)
_recognizer = sr.Recognizer()


def speak(text: str) -> None:
    print(f"ZPI: {text}")
    try:
        engine = pyttsx3.init()  # re-init each time avoids hangs on some OSes
        engine.setProperty("rate", SPEECH_RATE)
        engine.say(text)
        engine.runAndWait()
    except Exception:  # TTS itself failed; text is still printed
        log.exception("Text-to-speech failed")


def listen() -> str | None:
    """Return recognised lowercase text, or None if nothing understood."""
    with sr.Microphone() as source:
        _recognizer.adjust_for_ambient_noise(source, duration=0.5)
        print("Listening...")
        try:
            audio = _recognizer.listen(source, timeout=8, phrase_time_limit=10)
        except sr.WaitTimeoutError:
            return None
    try:
        text = _recognizer.recognize_google(audio, language=LANGUAGE)
        print(f"You: {text}")
        return text.lower().strip()
    except sr.UnknownValueError:
        return None
