from datetime import datetime


def tell_time(_text: str) -> str:
    return "The time is " + datetime.now().strftime("%I:%M %p").lstrip("0")


def tell_date(_text: str) -> str:
    return "Today is " + datetime.now().strftime("%A, %d %B %Y")
