"""Simple photo/video editing. Put files in ~/ZPI_Media/input,
edited copies are written to ~/ZPI_Media/output."""
import shutil
import subprocess

from PIL import Image, ImageFilter, ImageOps, UnidentifiedImageError

from ..config import MEDIA_IN, MEDIA_OUT
from ..errors import ZPIError

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
VIDEO_EXT = {".mp4", ".mov", ".mkv", ".avi", ".webm"}


def _files(exts):
    MEDIA_IN.mkdir(parents=True, exist_ok=True)
    MEDIA_OUT.mkdir(parents=True, exist_ok=True)
    found = [p for p in MEDIA_IN.iterdir() if p.suffix.lower() in exts]
    if not found:
        raise ZPIError(f"No files found. Put them in {MEDIA_IN}")
    return found


def _each_image(transform, label: str) -> str:
    count = 0
    for path in _files(IMAGE_EXT):
        try:
            with Image.open(path) as img:
                transform(img).save(MEDIA_OUT / f"{label}_{path.name}")
                count += 1
        except (UnidentifiedImageError, OSError):
            continue
    if not count:
        raise ZPIError("I could not edit any of the photos.")
    return f"Done. {count} photos saved in the output folder."


def grayscale_photos(_text: str) -> str:
    return _each_image(ImageOps.grayscale, "gray")


def blur_photos(_text: str) -> str:
    return _each_image(lambda i: i.filter(ImageFilter.GaussianBlur(4)), "blur")


def resize_photos(_text: str) -> str:
    return _each_image(lambda i: i.resize((max(1, i.width // 2), max(1, i.height // 2))), "small")


def rotate_photos(_text: str) -> str:
    return _each_image(lambda i: i.rotate(-90, expand=True), "rotated")


def _ffmpeg(args_builder, label: str) -> str:
    if not shutil.which("ffmpeg"):
        raise ZPIError("FFmpeg is not installed. Please install FFmpeg for video editing.")
    count = 0
    for path in _files(VIDEO_EXT):
        out = MEDIA_OUT / f"{label}_{path.stem}.mp4"
        cmd = ["ffmpeg", "-y", "-i", str(path), *args_builder(), str(out)]
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode == 0:
            count += 1
    if not count:
        raise ZPIError("Video editing failed.")
    return f"Done. {count} videos saved in the output folder."


def trim_videos(_text: str) -> str:
    return _ffmpeg(lambda: ["-t", "10", "-c:v", "libx264", "-c:a", "aac"], "trim10s")


def compress_videos(_text: str) -> str:
    return _ffmpeg(lambda: ["-vcodec", "libx264", "-crf", "28", "-preset", "fast"], "small")
