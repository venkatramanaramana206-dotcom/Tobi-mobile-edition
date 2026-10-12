from zpi.router import route


def test_time():
    assert route("what time is it").startswith("The time is")


def test_date():
    assert route("what is today's date").startswith("Today is")


def test_unknown():
    assert route("blah blah") is None
