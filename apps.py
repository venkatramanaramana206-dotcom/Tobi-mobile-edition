"""Open installed applications by name (Windows, macOS, Linux)."""
import platform
import re
import shutil
import subprocess

from ..errors import ZPIError

ALIASES = {
    "calculator": {"Windows": "calc", "Darwin": "Calculator", "Linux": "gnome-calculator"},
    "notepad": {"Windows": "notepad", "Darwin": "TextEdit", "Linux": "gedit"},
    "file explorer": {"Windows": "explorer", "Darwin": "Finder", "Linux": "nautilus"},
    "terminal": {"Windows": "cmd", "Darwin": "Terminal", "Linux": "gnome-terminal"},
    "chrome": {"Windows": "chrome", "Darwin": "Google Chrome", "Linux": "google-chrome"},
    "settings": {"Windows": "ms-settings:", "Darwin": "System Settings", "Linux": "gnome-control-center"},
}
SAFE = re.compile(r"^[\w .\-:]+$")  # block shell metacharacters from voice text


def _extract_name(text: str) -> str:
    name = re.sub(r"^(please\s+)?(open|launch|start)\s+", "", text).strip()
    name = re.sub(r"\s+(app|application)$", "", name)
    return name


def open_app(text: str) -> str:
    name = _extract_name(text)
    if not name or not SAFE.match(name):
        raise ZPIError("I did not catch which app to open.")
    system = platform.system()
    target = ALIASES.get(name, {}).get(system, name)
    try:
        if system == "Windows":
            subprocess.Popen(f'start "" "{target}"', shell=True)
        elif system == "Darwin":
            result = subprocess.run(["open", "-a", target], capture_output=True)
            if result.returncode != 0:
                raise ZPIError(f"I could not find an app called {name}.")
        else:
            exe = shutil.which(target) or shutil.which(target.replace(" ", "-"))
            if not exe:
                raise ZPIError(f"I could not find an app called {name}.")
            subprocess.Popen([exe])
    except OSError as exc:
        raise ZPIError(f"I could not open {name}.") from exc
    return f"Opening {name}"
