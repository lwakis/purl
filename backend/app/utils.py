"""Utility functions for the Purl backend."""

import hashlib
import uuid
from html.parser import HTMLParser


def generate_session_id() -> str:
    """Generate a short unique session identifier."""
    return uuid.uuid4().hex[:16]


def hash_prompt(prompt: str, theme: str, style: str) -> str:
    """Return SHA-256 hex digest of prompt + theme + style for cache keys."""
    raw = f'{prompt}||{theme}||{style}'
    return hashlib.sha256(raw.encode()).hexdigest()


class _HTMLValidator(HTMLParser):
    """Minimal HTML structural validator."""

    def __init__(self) -> None:
        super().__init__()
        self.has_doctype = False
        self.has_html = False
        self.tag_stack: list[str] = []
        self.errors: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in ('html', 'head', 'body', 'script', 'style'):
            self.tag_stack.append(tag)

    def handle_endtag(self, tag: str) -> None:
        if tag in ('html', 'head', 'body', 'script', 'style'):
            if self.tag_stack and self.tag_stack[-1] == tag:
                self.tag_stack.pop()

    def check(self, html: str) -> list[str]:
        self.feed(html)
        self.has_doctype = html.strip().startswith('<!DOCTYPE html>') or html.strip().startswith(
            '<!doctype html>'
        )
        self.has_html = '<html' in html.lower() and '</html>' in html.lower()
        if not self.has_doctype:
            self.errors.append('Missing <!DOCTYPE html>')
        if not self.has_html:
            self.errors.append('Missing <html> tag')
        return self.errors


def validate_html(html: str) -> list[str]:
    """Basic HTML validation; returns a list of issues (empty = valid)."""
    validator = _HTMLValidator()
    return validator.check(html)
