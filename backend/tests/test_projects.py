"""Project and version CRUD endpoint tests."""


def test_project_crud_flow(client, create_project):
    project = create_project()
    project_id = project['id']

    # List by session_id
    resp = client.get('/api/projects', params={'session_id': project['session_id']})
    assert resp.status_code == 200
    assert any(p['id'] == project_id for p in resp.json())

    # Get single
    resp = client.get(f'/api/projects/{project_id}')
    assert resp.status_code == 200
    assert resp.json()['name'] == 'Test Project'

    # Update
    resp = client.put(f'/api/projects/{project_id}', json={'name': 'Renamed'})
    assert resp.status_code == 200
    assert resp.json()['name'] == 'Renamed'

    # Delete
    resp = client.delete(f'/api/projects/{project_id}')
    assert resp.status_code == 204
    resp = client.get(f'/api/projects/{project_id}')
    assert resp.status_code == 404


def test_get_missing_project_returns_404(client):
    resp = client.get('/api/projects/999999')
    assert resp.status_code == 404


def test_versions_flow(client, create_project):
    project = create_project()
    project_id = project['id']

    v1 = client.post(
        f'/api/projects/{project_id}/versions',
        json={'code': '<html>v1</html>', 'message': 'first version'},
    )
    assert v1.status_code == 201
    assert v1.json()['version_num'] == 1

    v2 = client.post(
        f'/api/projects/{project_id}/versions',
        json={'code': '<html>v2</html>', 'message': 'second version'},
    )
    assert v2.status_code == 201
    assert v2.json()['version_num'] == 2

    # List newest first
    resp = client.get(f'/api/projects/{project_id}/versions')
    assert resp.status_code == 200
    versions = resp.json()
    assert [v['version_num'] for v in versions] == [2, 1]

    # Get specific version
    v1_id = v1.json()['id']
    resp = client.get(f'/api/projects/{project_id}/versions/{v1_id}')
    assert resp.status_code == 200
    assert resp.json()['code'] == '<html>v1</html>'

    # Missing version
    resp = client.get(f'/api/projects/{project_id}/versions/999999')
    assert resp.status_code == 404
