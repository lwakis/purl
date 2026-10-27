"""Style preset tests: metadata API, prompt assembly, cache isolation, projects."""

from __future__ import annotations

from helpers import extract_complete_html, parse_sse

from app.presets import PRESETS, get_preset, preset_fragment
from app.services.prompt_service import build_system_prompt
from app.utils import hash_prompt

# ── Preset catalog / API ─────────────────────────────────────────────────────


def test_presets_endpoint_returns_seven_in_order(client):
    resp = client.get('/api/presets')
    assert resp.status_code == 200
    body = resp.json()
    presets = body['presets']
    assert [p['id'] for p in presets] == [
        'swiss',
        'editorial',
        'brutalist',
        'minimal',
        'warm',
        'playful',
        'retro',
    ]
    for preset in presets:
        assert set(preset) == {'id', 'name', 'description', 'swatch'}
        assert preset['name']['ru'] and preset['name']['en']
        assert preset['description']['ru'] and preset['description']['en']
        assert len(preset['swatch']) == 3
        assert all(color.startswith('#') for color in preset['swatch'])


def test_presets_endpoint_never_exposes_fragments(client):
    resp = client.get('/api/presets')
    assert 'fragment' not in resp.text
    assert all('fragment' not in preset for preset in resp.json()['presets'])


def test_catalog_has_expected_ids():
    assert [preset.id for preset in PRESETS] == [
        'swiss',
        'editorial',
        'brutalist',
        'minimal',
        'warm',
        'playful',
        'retro',
    ]


# ── Prompt assembly ──────────────────────────────────────────────────────────


def test_build_system_prompt_appends_swiss_fragment_after_base_contract():
    prompt = build_system_prompt(preset='swiss')
    assert 'Apply Swiss International Typographic Style.' in prompt
    assert 'STYLE DIRECTION' in prompt
    # The immutable base contract is still intact.
    assert 'A single HTML file (CSS and JS inlined)' in prompt
    assert 'RESPONSE FORMAT: HTML code only' in prompt
    assert prompt.index('A single HTML file') < prompt.index('Apply Swiss')


def test_build_system_prompt_without_preset_has_no_style_direction():
    prompt = build_system_prompt()
    assert 'STYLE DIRECTION' not in prompt
    assert 'Apply Swiss' not in prompt


def test_build_system_prompt_ignores_unknown_preset():
    assert build_system_prompt(preset='does-not-exist') == build_system_prompt()
    assert preset_fragment('does-not-exist') == ''
    assert preset_fragment(None) == ''
    assert get_preset('does-not-exist') is None


def test_build_system_prompt_combines_plan_and_preset():
    prompt = build_system_prompt(plan=True, preset='retro')
    assert 'Before generating code, write a concise markdown plan' in prompt
    assert 'Apply retro terminal direction.' in prompt
    assert 'STYLE DIRECTION' in prompt


# ── Cache key ────────────────────────────────────────────────────────────────


def test_hash_prompt_includes_preset():
    base = hash_prompt('prompt')
    swiss = hash_prompt('prompt', preset='swiss')
    brutalist = hash_prompt('prompt', preset='brutalist')
    assert swiss != base
    assert swiss != brutalist
    assert swiss == hash_prompt('prompt', preset='swiss')


# ── Cache isolation through the API ──────────────────────────────────────────


def test_cache_isolated_by_preset(client):
    payload = {'prompt': 'Preset cache isolation'}

    first = client.post('/api/generate', json={**payload, 'preset': 'swiss'})
    assert first.status_code == 200
    first_types = [e['type'] for e in parse_sse(first.text)]
    assert {'analysis', 'design', 'code', 'complete'} <= set(first_types)
    first_html = extract_complete_html(first.text)

    # Identical request with the same preset is a cache hit.
    repeat = client.post('/api/generate', json={**payload, 'preset': 'swiss'})
    assert repeat.status_code == 200
    assert [e['type'] for e in parse_sse(repeat.text)] == ['analysis', 'complete']
    assert extract_complete_html(repeat.text) == first_html

    # Same prompt, different preset must stream again.
    brutalist = client.post('/api/generate', json={**payload, 'preset': 'brutalist'})
    assert brutalist.status_code == 200
    brutalist_types = [e['type'] for e in parse_sse(brutalist.text)]
    assert 'code' in brutalist_types
    assert 'design' in brutalist_types


# ── Projects ─────────────────────────────────────────────────────────────────


def test_project_preset_roundtrip_clear_and_duplicate(client):
    created = client.post(
        '/api/projects',
        json={'name': 'Preset project', 'preset': 'swiss'},
    )
    assert created.status_code == 201
    project = created.json()
    project_id = project['id']
    assert project['preset'] == 'swiss'

    fetched = client.get(f'/api/projects/{project_id}')
    assert fetched.status_code == 200
    assert fetched.json()['preset'] == 'swiss'

    cleared = client.put(f'/api/projects/{project_id}', json={'preset': None})
    assert cleared.status_code == 200
    assert cleared.json()['preset'] is None
    assert client.get(f'/api/projects/{project_id}').json()['preset'] is None

    # Duplicate copies the preset.
    client.put(f'/api/projects/{project_id}', json={'preset': 'warm'})
    duplicate = client.post(f'/api/projects/{project_id}/duplicate')
    assert duplicate.status_code == 201
    assert duplicate.json()['preset'] == 'warm'

    # Branching from a version keeps the source project's preset.
    version = client.post(
        f'/api/projects/{project_id}/versions',
        json={'code': '<!DOCTYPE html><html><body>v1</body></html>', 'message': 'v1'},
    )
    assert version.status_code == 201
    branch = client.post(f'/api/projects/{project_id}/versions/{version.json()["id"]}/branch')
    assert branch.status_code == 201
    assert branch.json()['preset'] == 'warm'


# ── Unknown presets are accepted ─────────────────────────────────────────────


def test_generate_accepts_unknown_preset(client):
    resp = client.post(
        '/api/generate',
        json={'prompt': 'Unknown preset generate', 'preset': 'no-such-preset'},
    )
    assert resp.status_code == 200
    assert 'complete' in [e['type'] for e in parse_sse(resp.text)]


def test_iterate_accepts_unknown_preset(client):
    resp = client.post(
        '/api/iterate',
        json={
            'message': 'Сделай кнопку красной',
            'current_code': '<!DOCTYPE html><html><body><h1>Hi</h1></body></html>',
            'preset': 'no-such-preset',
        },
    )
    assert resp.status_code == 200
    assert 'complete' in [e['type'] for e in parse_sse(resp.text)]


# ── SQLite migration helper ──────────────────────────────────────────────────


def test_migration_helper_adds_preset_column_to_legacy_db(tmp_path):
    from sqlalchemy import create_engine, inspect, text

    from app.database import migrate_projects_table

    db_path = tmp_path / 'legacy.db'
    engine = create_engine(f'sqlite:///{db_path}')
    try:
        with engine.begin() as conn:
            conn.execute(
                text(
                    'CREATE TABLE projects (id INTEGER PRIMARY KEY, name VARCHAR(255), prompt TEXT)'
                )
            )

        with engine.begin() as conn:
            migrate_projects_table(conn)

        with engine.connect() as conn:
            columns = {column['name'] for column in inspect(conn).get_columns('projects')}
        assert 'preset' in columns

        # Idempotent: running it again must not fail.
        with engine.begin() as conn:
            migrate_projects_table(conn)
    finally:
        engine.dispose()
