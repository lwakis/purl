"""System prompt assembly helpers."""

from __future__ import annotations

from app.prompts import SYSTEM_PROMPT

_THEME_INSTRUCTIONS: dict[str, str] = {
    'light': (
        'Use a light color scheme with a light background and dark text. '
        'Prefer white or light-gray backgrounds.'
    ),
    'dark': (
        'Use a dark color scheme with a dark background and light text. '
        'Prefer #0f0f13 and #1a1a23 as the primary backgrounds.'
    ),
    'auto': (
        'Honor prefers-color-scheme with a media query for the dark theme. '
        'Default to the light theme.'
    ),
}

_STYLE_INSTRUCTIONS: dict[str, str] = {
    'minimal': (
        'Minimalist design with generous whitespace, thin lines and restrained colors. Font: Inter.'
    ),
    'corporate': (
        'Corporate style with strict lines, a blue or navy color palette and '
        'clear CTA buttons. Font: Inter or Roboto.'
    ),
    'playful': (
        'Playful design with vivid colors (pink, yellow, purple), rounded '
        'corners and fun micro-animations. Font: Nunito or Poppins.'
    ),
    'techno': (
        'Futuristic/tech style with dark backgrounds, neon accents '
        '(cyan, green, purple) and glassmorphism effects. Font: Space Grotesk '
        'or JetBrains Mono.'
    ),
}


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


def build_system_prompt(
    theme: str = 'auto',
    style: str = 'minimal',
    plan: bool = False,
) -> str:
    """Return the full system prompt with theme/style instructions appended."""
    theme_instruction = _THEME_INSTRUCTIONS.get(theme, _THEME_INSTRUCTIONS['auto'])
    style_instruction = _STYLE_INSTRUCTIONS.get(style, _STYLE_INSTRUCTIONS['minimal'])

    prompt = (
        SYSTEM_PROMPT
        + '\n\nADDITIONAL STYLE REQUIREMENTS:\n'
        + theme_instruction
        + '\n'
        + style_instruction
        + '\n'
        + _LANG_INSTRUCTION
    )
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
