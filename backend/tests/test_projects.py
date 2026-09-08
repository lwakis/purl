"""Project and version CRUD endpoint tests."""


def test_project_crud_flow(client, create_project):
    project = create_project()
    project_id = project['id']

    # List by session_id (paginated envelope)
    resp = client.get('/api/projects', params={'session_id': project['session_id']})
    assert resp.status_code == 200
    body = resp.json()
    assert body['total'] == 1
    assert any(p['id'] == project_id for p in body['items'])

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


def test_projects_search_matches_name_case_insensitively(client, create_project):
    create_project(name='Landing Page', prompt='A landing page', session_id='ses-search')
    create_project(name='Dashboard', prompt='Analytics dashboard', session_id='ses-search')

    resp = client.get('/api/projects', params={'session_id': 'ses-search', 'q': 'landing'})
    assert resp.status_code == 200
    body = resp.json()
    assert body['total'] == 1
    assert [p['name'] for p in body['items']] == ['Landing Page']


def test_projects_search_matches_prompt(client, create_project):
    create_project(name='Alpha', prompt='Marketing site', session_id='ses-search')
    create_project(name='Beta', prompt='Mobile app', session_id='ses-search')

    resp = client.get('/api/projects', params={'session_id': 'ses-search', 'q': 'Marketing'})
    body = resp.json()
    assert body['total'] == 1
    assert body['items'][0]['name'] == 'Alpha'


def test_projects_search_no_match_returns_empty(client, create_project):
    create_project(name='Alpha', prompt='thing', session_id='ses-search')

    resp = client.get('/api/projects', params={'session_id': 'ses-search', 'q': 'zzz'})
    body = resp.json()
    assert body['total'] == 0
    assert body['items'] == []


def test_projects_pagination_slices_and_reports_total(client, create_project):
    for i in range(5):
        create_project(name=f'Project {i}', session_id='ses-page')

    resp = client.get('/api/projects', params={'session_id': 'ses-page', 'page': 1, 'page_size': 2})
    body = resp.json()
    assert body['total'] == 5
    assert body['page'] == 1
    assert body['page_size'] == 2
    assert len(body['items']) == 2


def test_projects_pagination_beyond_last_page_returns_empty_items(client, create_project):
    create_project(name='Solo', session_id='ses-page2')

    resp = client.get(
        '/api/projects', params={'session_id': 'ses-page2', 'page': 9, 'page_size': 2}
    )
    body = resp.json()
    assert body['total'] == 1
    assert body['items'] == []
    assert body['page'] == 9
