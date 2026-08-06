"""System prompt assembly helpers."""

from __future__ import annotations

from app.prompts import SYSTEM_PROMPT

_THEME_INSTRUCTIONS: dict[str, str] = {
    'light': (
        'Используй светлую цветовую схему со светлым фоном и тёмным текстом. '
        'Отдавай предпочтение белому или светло-серому фону.'
    ),
    'dark': (
        'Используй тёмную цветовую схему с тёмным фоном и светлым текстом. '
        'Отдавай предпочтение цветам #0f0f13, #1a1a23 как основным фонам.'
    ),
    'auto': (
        'Учти prefers-color-scheme и добавь media query для тёмной темы. '
        'По умолчанию используй светлую тему.'
    ),
}

_STYLE_INSTRUCTIONS: dict[str, str] = {
    'minimal': (
        'Минималистичный дизайн с большим количеством пустого пространства, '
        'тонкими линиями и сдержанными цветами. Шрифт: Inter.'
    ),
    'corporate': (
        'Корпоративный стиль со строгими линиями, синей или тёмно-синей '
        'цветовой гаммой, чёткими CTA-кнопками. Шрифт: Inter или Roboto.'
    ),
    'playful': (
        'Игривый дизайн с яркими цветами (розовый, жёлтый, фиолетовый), '
        'скруглёнными углами, забавными микро-анимациями. Шрифт: Nunito или Poppins.'
    ),
    'techno': (
        'Футуристический/технологичный стиль с тёмными фонами, неоновыми '
        'акцентами (голубой, зелёный, фиолетовый), стеклянными эффектами '
        '(glassmorphism). Шрифт: Space Grotesk или JetBrains Mono.'
    ),
}


def build_system_prompt(theme: str = 'auto', style: str = 'minimal') -> str:
    """Return the full system prompt with theme/style instructions appended."""
    theme_instruction = _THEME_INSTRUCTIONS.get(theme, _THEME_INSTRUCTIONS['auto'])
    style_instruction = _STYLE_INSTRUCTIONS.get(style, _STYLE_INSTRUCTIONS['minimal'])

    return (
        SYSTEM_PROMPT
        + '\n\nДОПОЛНИТЕЛЬНЫЕ ТРЕБОВАНИЯ К СТИЛЮ:\n'
        + theme_instruction
        + '\n'
        + style_instruction
    )


def build_generate_prompt(user_prompt: str) -> str:
    """Wrap the user prompt for a fresh generation."""
    return (
        f'Создай HTML-страницу по следующему описанию:\n\n{user_prompt}\n\n'
        'Важно: верни только HTML-код без пояснений.'
    )


def build_iterate_prompt(
    history: list[dict[str, str]],
    current_code: str,
    user_message: str,
) -> str:
    """Assemble the iteration context with history and current code."""
    parts: list[str] = [
        'Измени существующий HTML-код в соответствии с новыми указаниями пользователя.',
        '',
        'ТЕКУЩИЙ HTML-КОД:',
        '```html',
        current_code,
        '```',
        '',
        'ИСТОРИЯ ПРЕДЫДУЩИХ ИЗМЕНЕНИЙ:',
    ]

    if history:
        for msg in history[-6:]:
            role = 'Пользователь' if msg.get('role') == 'user' else 'Дизайнер'
            content = msg.get('content', '')
            parts.append(f'{role}: {content}')
    else:
        parts.append('(нет истории)')

    parts.extend(
        [
            '',
            f'НОВЫЙ ЗАПРОС ПОЛЬЗОВАТЕЛЯ: {user_message}',
            '',
            'Важно: верни только изменённый полный HTML-код (всегда с <!DOCTYPE html>), без пояснений.',
        ]
    )

    return '\n'.join(parts)
