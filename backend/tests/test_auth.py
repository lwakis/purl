"""Authentication endpoint tests."""

import uuid


def test_anon_session_returns_session_and_token(client):
    resp = client.post('/api/auth/anon')
    assert resp.status_code == 200
    data = resp.json()
    assert data['session_id']
    assert data['token']


def test_register_success(client):
    email = f'user-{uuid.uuid4().hex[:8]}@example.com'
    resp = client.post(
        '/api/auth/register',
        json={'email': email, 'password': 'secret123', 'name': 'Test User'},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data['email'] == email
    assert data['name'] == 'Test User'
    assert data['user_id']
    assert data['token']


def test_register_duplicate_email_returns_409(client):
    email = f'dup-{uuid.uuid4().hex[:8]}@example.com'
    payload = {'email': email, 'password': 'secret123'}
    assert client.post('/api/auth/register', json=payload).status_code == 201
    resp = client.post('/api/auth/register', json=payload)
    assert resp.status_code == 409


def test_login_success(client):
    email = f'login-{uuid.uuid4().hex[:8]}@example.com'
    client.post('/api/auth/register', json={'email': email, 'password': 'secret123'})
    resp = client.post('/api/auth/login', json={'email': email, 'password': 'secret123'})
    assert resp.status_code == 200
    data = resp.json()
    assert data['email'] == email
    assert data['token']


def test_login_wrong_password_returns_401(client):
    email = f'bad-{uuid.uuid4().hex[:8]}@example.com'
    client.post('/api/auth/register', json={'email': email, 'password': 'secret123'})
    resp = client.post('/api/auth/login', json={'email': email, 'password': 'wrongpass'})
    assert resp.status_code == 401
