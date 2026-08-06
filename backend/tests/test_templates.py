"""Prompt template endpoint tests."""


def test_templates_returns_eight_seeded(client):
    resp = client.get('/api/templates')
    assert resp.status_code == 200
    templates = resp.json()
    assert len(templates) == 8
    for template in templates:
        assert template['title']
        assert template['prompt_text']
