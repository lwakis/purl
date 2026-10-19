"""System prompt assembly helpers."""

from __future__ import annotations

from app.prompts import SYSTEM_PROMPT

_PLAN_INSTRUCTION = (
    'Before generating code, write a concise markdown plan of the implementation steps, '
    'then generate the code.'
)

# Reminds the model to write visible page copy in the user's language. The
# SYSTEM_PROMPT carries the same rule; this keeps the wrapper self-contained.
_LANG_INSTRUCTION = (
    'Write the visible page copy (headings, body text, buttons, labels) in the '
    "same language as the user's request."
)


def _detect_lang(text: str) -> str:
    """Return ``'ru'`` when the text is mostly Cyrillic, else ``'en'``."""
    from app.services.mock_provider import detect_lang

    return detect_lang(text)


def build_system_prompt(plan: bool = False) -> str:
    """Return the full system prompt, optionally with the planning instruction."""
    prompt = SYSTEM_PROMPT + '\n\n' + _LANG_INSTRUCTION
    if plan:
        prompt += '\n\n' + _PLAN_INSTRUCTION
    return prompt


def build_generate_prompt(user_prompt: str) -> str:
    """Wrap the user prompt for a fresh generation."""
    lang = _detect_lang(user_prompt)
    instruction = (
        'Create an HTML page from the following description (in this language):\n\n'
        if lang == 'ru'
        else 'Create an HTML page from the following description:\n\n'
    )
    return (
        instruction
        + user_prompt
        + '\n\n'
        + 'Important: return only the HTML code, no explanations.'
    )


def build_iterate_prompt(
    history: list[dict[str, str]],
    current_code: str,
    user_message: str,
    selected_element: str | None = None,
) -> str:
    """Assemble the iteration context with history and current code."""
    lang = _detect_lang(user_message)
    role_label = 'Пользователь' if lang == 'ru' else 'User'
    designer_label = 'Дизайнер' if lang == 'ru' else 'Designer'

    parts: list[str] = [
        "Modify the existing HTML code according to the user's new instructions.",
        '',
        'CURRENT HTML CODE:',
        '```html',
        current_code,
        '```',
        '',
        'HISTORY OF PREVIOUS CHANGES:',
    ]

    if history:
        for msg in history[-6:]:
            role = role_label if msg.get('role') == 'user' else designer_label
            content = msg.get('content', '')
            parts.append(f'{role}: {content}')
    else:
        parts.append('(no history)')

    parts.extend(
        [
            '',
            f'NEW USER REQUEST: {user_message}',
        ]
    )
    if selected_element:
        parts.append(f'Selected element: {selected_element}')

    parts.extend(
        [
            '',
            'Important: return only the modified full HTML code (always with '
            '<!DOCTYPE html>), no explanations.',
        ]
    )

    return '\n'.join(parts)
