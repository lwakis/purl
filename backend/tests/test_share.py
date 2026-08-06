"""Share-link endpoint tests."""


def test_share_flow(client, create_project):
    project = create_project()
    resp = client.post('/api/share', json={'project_id': project['id']})
    assert resp.status_code == 201
    data = resp.json()
    short_code = data['short_code']
    assert short_code
    assert data['url'] == f'/api/share/{short_code}'

    # Public lookup by code
    resp = client.get(f'/api/share/{short_code}')
    assert resp.status_code == 200
    body = resp.json()
    assert body['name'] == project['name']
    assert body['code'] == project['current_code']


def test_share_unknown_code_returns_404(client):
    resp = client.get('/api/share/doesnotexist')
    assert resp.status_code == 404


def test_share_missing_project_returns_404(client):
    resp = client.post('/api/share', json={'project_id': 999999})
    assert resp.status_code == 404
