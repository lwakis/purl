"""Helpers for parsing buffered SSE responses in tests."""

import json


def parse_sse(text: str) -> list[dict]:
    """Parse a buffered SSE response body into a list of event payloads."""
    events = []
    for line in text.splitlines():
        if line.startswith('data: '):
            events.append(json.loads(line[6:]))
    return events


def extract_complete_html(text: str) -> str:
    """Return the HTML content of the ``complete`` SSE event."""
    for event in parse_sse(text):
        if event.get('type') == 'complete':
            return event.get('content', '')
    raise AssertionError('No "complete" event found in SSE response')
