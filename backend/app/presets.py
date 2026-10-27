"""Curated style presets appended to the immutable system-prompt contract.

A preset is an *additive* style fragment. It never replaces or weakens the base
contract in :mod:`app.prompts`; the prompt builder appends it as a separate
``STYLE DIRECTION`` section. ``None`` means Auto (no fragment), and unknown ids
are ignored gracefully so stale clients keep working.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Preset:
    """A single curated style preset."""

    id: str
    name: dict[str, str]
    description: dict[str, str]
    swatch: tuple[str, ...]
    fragment: str


PRESETS: tuple[Preset, ...] = (
    Preset(
        id='swiss',
        name={'ru': 'Швейцарский', 'en': 'Swiss'},
        description={
            'ru': 'Сетка, типографика, воздух и один акцентный цвет',
            'en': 'Grid, typography, whitespace and one accent color',
        },
        swatch=('#F2F0EB', '#111111', '#E03C31'),
        fragment=(
            'Apply Swiss International Typographic Style. Compose on a strict, visible '
            'grid with strong alignment and generous negative space. Typography carries '
            'the design: one grotesque sans family, dramatic scale contrast between '
            'display and body, uppercase micro-labels with wide letter-spacing, tight '
            'leading on headlines. Palette: off-white or light neutral surface, '
            'near-black text, exactly one signal color used sparingly for emphasis and '
            'interactive states. Use asymmetric but rational layouts, rectangular image '
            'crops, hairline rules and numbered lists. Corners square (radius 0-2px), no '
            'shadows, no gradients. Motion minimal and functional.'
        ),
    ),
    Preset(
        id='editorial',
        name={'ru': 'Редакционный', 'en': 'Editorial'},
        description={
            'ru': 'Журнальная вёрстка: крупные заголовки, серифы, правила',
            'en': 'Magazine layout: big headlines, serifs, rules',
        },
        swatch=('#F6F1E7', '#1A1712', '#7A2E2E'),
        fragment=(
            'Apply editorial magazine direction. Lead with expressive typography: a '
            'high-contrast serif display face paired with a quiet sans for UI text, '
            'oversized headlines, drop caps, hanging punctuation, and multi-column body '
            'text where the width allows. Palette: warm paper background, ink-black text, '
            'one deep accent (oxblood, forest or navy). Use rules, folios, captions, '
            'issue-style metadata and numbered sections as structure. Photography crops '
            'wide and cinematic; text measure stays 60-75 characters. No rounded cards, no '
            'glass, no gradients - type and rules do the work.'
        ),
    ),
    Preset(
        id='brutalist',
        name={'ru': 'Брутализм', 'en': 'Brutalist'},
        description={
            'ru': 'Жёсткие рамки, резкие тени, громкая типографика',
            'en': 'Hard borders, offset shadows, loud type',
        },
        swatch=('#F5F1E8', '#111111', '#FFE600'),
        fragment=(
            'Apply neo-brutalist direction. Be loud, honest and structural. Use thick '
            '2-3px black borders, hard offset shadows with zero blur, visible grid lines '
            'and exposed containers, oversized condensed or monospace display type. '
            'Palette: off-white paper, near-black ink plus one or two clashing accents '
            '(acid yellow, cobalt, hot red) used in flat blocks. Buttons are rectangles '
            'with physical press states. Use monospace for labels, metadata and numbers. '
            'No gradients, no soft blurred shadows, corners at most 4px. Blocks butt '
            'against each other; whitespace is raw and intentional.'
        ),
    ),
    Preset(
        id='minimal',
        name={'ru': 'Минимализм', 'en': 'Minimal'},
        description={
            'ru': 'Сдержанность, монохром, точные отступы',
            'en': 'Restraint, monochrome, precise spacing',
        },
        swatch=('#FAFAF7', '#2B2B2B', '#8A8F7D'),
        fragment=(
            'Apply precision minimalism. Restraint is the design. Near-monochrome palette '
            '- warm white, graphite, one restrained accent - with one humanist sans or '
            'refined grotesque in two or three weights. Follow a strict 8px spacing scale '
            'and a small, consistent type scale. Separate elements with whitespace and '
            'hairlines instead of cards and boxes. Keep radii small and avoid shadows; '
            'depth comes from layout and contrast. Motion slow, subtle and meaningful. '
            'Remove any decorative element that does not serve the content.'
        ),
    ),
    Preset(
        id='warm',
        name={'ru': 'Тёплый', 'en': 'Warm'},
        description={
            'ru': 'Кремовые тона, мягкие формы, живая фактура',
            'en': 'Cream tones, soft shapes, tactile texture',
        },
        swatch=('#F3E9D7', '#3E2F25', '#C4623D'),
        fragment=(
            'Apply warm humanist direction. Make the page tactile, calm and welcoming. '
            'Palette: cream, sand, terracotta, olive and ink; surfaces may carry a subtle '
            'paper grain or noise texture. Rounded corners 12-20px, soft but restrained '
            'shadows, organic accents and a humanist sans paired with a display serif for '
            'headings. Photography and illustration feel sunlit and real rather than '
            'stock-corporate. Generous line-height, friendly microcopy, gentle '
            'transitions. Avoid clinical white and corporate blue.'
        ),
    ),
    Preset(
        id='playful',
        name={'ru': 'Игровой', 'en': 'Playful'},
        description={
            'ru': 'Яркие блоки, крупные формы, лёгкий хаос',
            'en': 'Bright blocks, oversized shapes, light chaos',
        },
        swatch=('#FFF3D6', '#231F20', '#FF5C8A'),
        fragment=(
            'Apply playful color-block direction. Be energetic and graphic. Compose with '
            'saturated flat color blocks, oversized rounded display type, sticker-like '
            'badges, slightly tilted elements, thick outlines and bold geometric shapes in '
            'confident asymmetry. Palette: three or four saturated hues anchored by cream '
            'and ink. Buttons are chunky with obvious hover and press feedback; delight '
            'through small springy motion that never blocks the task. Use emoji or simple '
            'geometric illustration sparingly. Avoid muddy gradients and default SaaS '
            'compositions.'
        ),
    ),
    Preset(
        id='retro',
        name={'ru': 'Ретро-терминал', 'en': 'Retro terminal'},
        description={
            'ru': 'Фосфорный терминал, моноширинный шрифт, свечение',
            'en': 'Phosphor terminal, monospace, glow',
        },
        swatch=('#0B0F0A', '#8DFF6A', '#FFB000'),
        fragment=(
            'Apply retro terminal direction. Build the page like a beautifully designed '
            'TUI: monochrome phosphor palette (amber-on-black or green-on-black) with one '
            'alert color, monospace everywhere, subtle scanline or noise texture, glowing '
            'borders, ASCII-style dividers and bracketed labels. Use dense grids, status '
            'bars and numbered menus as structure. Hard edges, no rounded cards, no '
            'photography - use glyphs, rules and CSS shapes instead. Motion may echo a '
            'blinking cursor or type-on effect; keep it tasteful and readable.'
        ),
    ),
)

PRESET_BY_ID: dict[str, Preset] = {preset.id: preset for preset in PRESETS}


def get_preset(preset_id: str | None) -> Preset | None:
    """Return the preset for *preset_id*, or ``None`` for Auto/unknown ids."""
    if not preset_id:
        return None
    return PRESET_BY_ID.get(preset_id)


def preset_fragment(preset_id: str | None) -> str:
    """Return the style fragment for *preset_id*; empty for None/unknown ids."""
    preset = get_preset(preset_id)
    return preset.fragment if preset is not None else ''


def presets_payload() -> list[dict]:
    """Return preset metadata only (never the internal fragment text)."""
    return [
        {
            'id': preset.id,
            'name': dict(preset.name),
            'description': dict(preset.description),
            'swatch': list(preset.swatch),
        }
        for preset in PRESETS
    ]
