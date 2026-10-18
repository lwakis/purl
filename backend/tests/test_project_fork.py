"""Duplicate-project and branch-from-version endpoint tests."""


def _add_version(client, project_id, code, message=None):
    payload = {'code': code}
    if message is not None:
        payload['message'] = message
    resp = client.post(f'/api/projects/{project_id}/versions', json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Duplicate ────────────────────────────────────────────────────────────────


def test_duplicate_project_copies_fields(client, create_project):
    source = create_project(name='Original', session_id='ses-dup')
    client.put(
        f'/api/projects/{source["id"]}',
        json={'theme': 'dark', 'style': 'playful'},
    )

    resp = client.post(f'/api/projects/{source["id"]}/duplicate')
    assert resp.status_code == 201
    copy = resp.json()

    assert copy['id'] != source['id']
    assert copy['prompt'] == source['prompt']
    assert copy['current_code'] == source['current_code']
    assert copy['theme'] == 'dark'
    assert copy['style'] == 'playful'
    assert copy['session_id'] == source['session_id']


def test_duplicate_copies_all_versions_with_new_ids(client, create_project):
    source = create_project(session_id='ses-dup')
    _add_version(client, source['id'], '<html>v1</html>', 'first')
    _add_version(client, source['id'], '<html>v2</html>', 'second')

    source_versions = client.get(f'/api/projects/{source["id"]}/versions').json()

    resp = client.post(f'/api/projects/{source["id"]}/duplicate')
    assert resp.status_code == 201
    copy_id = resp.json()['id']

    copy_versions = client.get(f'/api/projects/{copy_id}/versions').json()
    assert len(copy_versions) == len(source_versions) == 2

    for src, dup in zip(
        sorted(source_versions, key=lambda v: v['version_num']),
        sorted(copy_versions, key=lambda v: v['version_num']),
        strict=True,
    ):
        assert dup['version_num'] == src['version_num']
        assert dup['code'] == src['code']
        assert dup['message'] == src['message']
        assert dup['id'] != src['id']

    source_ids = {v['id'] for v in source_versions}
    copy_ids = {v['id'] for v in copy_versions}
    assert source_ids.isdisjoint(copy_ids)


def test_duplicate_honors_custom_name(client, create_project):
    source = create_project(session_id='ses-dup')
    resp = client.post(f'/api/projects/{source["id"]}/duplicate', json={'name': 'My Clone'})
    assert resp.status_code == 201
    assert resp.json()['name'] == 'My Clone'


def test_duplicate_default_name_ends_with_copy(client, create_project):
    source = create_project(name='Original', session_id='ses-dup')
    resp = client.post(f'/api/projects/{source["id"]}/duplicate')
    assert resp.status_code == 201
    assert resp.json()['name'].endswith('(copy)')


def test_duplicate_appears_in_session_listing(client, create_project):
    source = create_project(session_id='ses-dup-list')
    resp = client.post(f'/api/projects/{source["id"]}/duplicate')
    copy_id = resp.json()['id']

    listing = client.get('/api/projects', params={'session_id': 'ses-dup-list'})
    assert listing.status_code == 200
    ids = [p['id'] for p in listing.json()['items']]
    assert copy_id in ids
    assert source['id'] in ids


def test_duplicate_unknown_project_returns_404(client):
    resp = client.post('/api/projects/999999/duplicate')
    assert resp.status_code == 404


# ── Branch ───────────────────────────────────────────────────────────────────


def test_branch_uses_version_code(client, create_project):
    source = create_project(session_id='ses-branch')
    _add_version(client, source['id'], '<html>v1</html>', 'first')
    v2 = _add_version(client, source['id'], '<html>v2</html>', 'second')

    resp = client.post(f'/api/projects/{source["id"]}/versions/{v2["id"]}/branch')
    assert resp.status_code == 201
    branch = resp.json()

    assert branch['id'] != source['id']
    assert branch['current_code'] == '<html>v2</html>'
    assert branch['session_id'] == source['session_id']


def test_branch_default_name_contains_version_num(client, create_project):
    source = create_project(name='Original', session_id='ses-branch')
    _add_version(client, source['id'], '<html>v1</html>', 'first')
    v2 = _add_version(client, source['id'], '<html>v2</html>', 'second')

    resp = client.post(f'/api/projects/{source["id"]}/versions/{v2["id"]}/branch')
    assert resp.status_code == 201
    assert f'v{v2["version_num"]}' in resp.json()['name']


def test_branch_honors_custom_name(client, create_project):
    source = create_project(session_id='ses-branch')
    v1 = _add_version(client, source['id'], '<html>v1</html>', 'first')

    resp = client.post(
        f'/api/projects/{source["id"]}/versions/{v1["id"]}/branch',
        json={'name': 'Forked'},
    )
    assert resp.status_code == 201
    assert resp.json()['name'] == 'Forked'


def test_branch_has_no_versions(client, create_project):
    source = create_project(session_id='ses-branch')
    v1 = _add_version(client, source['id'], '<html>v1</html>', 'first')

    resp = client.post(f'/api/projects/{source["id"]}/versions/{v1["id"]}/branch')
    assert resp.status_code == 201
    branch_id = resp.json()['id']

    versions = client.get(f'/api/projects/{branch_id}/versions').json()
    assert versions == []


def test_branch_prompt_falls_back_to_source(client, create_project):
    source = create_project(prompt='Source prompt', session_id='ses-branch')
    v1 = _add_version(client, source['id'], '<html>v1</html>')  # message omitted → None

    resp = client.post(f'/api/projects/{source["id"]}/versions/{v1["id"]}/branch')
    assert resp.status_code == 201
    assert resp.json()['prompt'] == 'Source prompt'


def test_branch_uses_version_message_as_prompt(client, create_project):
    source = create_project(prompt='Source prompt', session_id='ses-branch')
    v1 = _add_version(client, source['id'], '<html>v1</html>', 'Version message')

    resp = client.post(f'/api/projects/{source["id"]}/versions/{v1["id"]}/branch')
    assert resp.status_code == 201
    assert resp.json()['prompt'] == 'Version message'


def test_branch_unknown_project_returns_404(client):
    resp = client.post('/api/projects/999999/versions/1/branch')
    assert resp.status_code == 404


def test_branch_unknown_version_returns_404(client, create_project):
    source = create_project(session_id='ses-branch')
    resp = client.post(f'/api/projects/{source["id"]}/versions/999999/branch')
    assert resp.status_code == 404


def test_branch_foreign_version_returns_404(client, create_project):
    source = create_project(session_id='ses-branch')
    other = create_project(session_id='ses-branch-other')
    foreign = _add_version(client, other['id'], '<html>other</html>', 'other version')

    resp = client.post(f'/api/projects/{source["id"]}/versions/{foreign["id"]}/branch')
    assert resp.status_code == 404
