import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createProject,
  duplicateProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  getProjectVersions,
  branchFromVersion,
  getModels,
  testProvider,
  getUsage,
  enhancePrompt,
  exportReactProject,
  getInstanceInfo,
  unlockInstance,
} from './api';
import {
  UNAUTHORIZED_EVENT,
  clearInstanceToken,
  getInstanceToken,
  setInstanceToken,
} from './instanceAuth';

interface MockResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

function mockResponse(data: unknown, ok = true, status = 200): MockResponse {
  return {
    ok,
    status,
    json: async () => data,
    text: async () => (typeof data === 'string' ? data : JSON.stringify(data)),
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  clearInstanceToken();
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearInstanceToken();
});

describe('api client', () => {
  it('createProject POSTs /api/projects with the full JSON body', async () => {
    const project = {
      id: 1,
      name: 'My Site',
      prompt: 'Build a landing page',
      current_code: '<div/>',
      session_id: 'sess-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    fetchMock.mockResolvedValue(mockResponse(project));

    const data = {
      name: 'My Site',
      prompt: 'Build a landing page',
      current_code: '<div/>',
      session_id: 'sess-1',
    };

    const result = await createProject(data);

    expect(result).toEqual(project);
    expect(fetchMock).toHaveBeenCalledWith('/api/projects', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(data),
    });
  });

  it('getProjects GETs /api/projects and returns the paginated envelope', async () => {
    const projects = [
      {
        id: 1,
        name: 'A',
        prompt: 'p',
        current_code: 'c',
        session_id: 's',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];
    const envelope = { items: projects, total: 1, page: 1, page_size: 50 };
    fetchMock.mockResolvedValue(mockResponse(envelope));

    const result = await getProjects();

    expect(result).toEqual(envelope);
    expect(fetchMock).toHaveBeenCalledWith('/api/projects', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('getProjects sends session, search, page and page_size query params', async () => {
    fetchMock.mockResolvedValue(mockResponse({ items: [], total: 0, page: 2, page_size: 20 }));

    await getProjects('sess-9', { search: 'landing', page: 2, pageSize: 20 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects?session_id=sess-9&q=landing&page=2&page_size=20',
      { headers: { 'Content-Type': 'application/json' } },
    );
  });

  it('getProjects omits the page param when on page one', async () => {
    fetchMock.mockResolvedValue(mockResponse({ items: [], total: 0, page: 1, page_size: 50 }));

    await getProjects('sess-9', { search: '', page: 1 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects?session_id=sess-9',
      { headers: { 'Content-Type': 'application/json' } },
    );
  });

  it('getProject GETs /api/projects/:id', async () => {
    const project = {
      id: 7,
      name: 'A',
      prompt: 'p',
      current_code: 'c',
      session_id: 's',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    fetchMock.mockResolvedValue(mockResponse(project));

    const result = await getProject(7);

    expect(result).toEqual(project);
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/7', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('updateProject PUTs /api/projects/:id with the JSON body', async () => {
    const updated = {
      id: 3,
      name: 'Renamed',
      prompt: 'p',
      current_code: 'c',
      session_id: 's',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    };
    fetchMock.mockResolvedValue(mockResponse(updated));

    const result = await updateProject(3, { name: 'Renamed' });

    expect(result).toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/3', {
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
      body: JSON.stringify({ name: 'Renamed' }),
    });
  });

  it('deleteProject DELETEs /api/projects/:id and resolves on 204', async () => {
    fetchMock.mockResolvedValue(mockResponse(undefined, true, 204));

    await expect(deleteProject(9)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith('/api/projects/9', {
      headers: { 'Content-Type': 'application/json' },
      method: 'DELETE',
    });
  });

  it('getProjectVersions GETs /api/projects/:id/versions', async () => {
    const versions = [
      {
        id: 1,
        version_num: 1,
        code: 'c',
        message: 'm',
        created_at: '2024-01-01T00:00:00Z',
      },
    ];
    fetchMock.mockResolvedValue(mockResponse(versions));

    const result = await getProjectVersions(4);

    expect(result).toEqual(versions);
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/4/versions', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('getModels GETs /api/models and returns the providers array', async () => {
    const providers = [
      {
        id: 'openai',
        name: 'OpenAI',
        models: [{ id: 'gpt-4o', label: 'GPT-4o' }],
        ready: true,
      },
    ];
    fetchMock.mockResolvedValue(mockResponse({ providers }));

    const result = await getModels();

    expect(result).toEqual(providers);
    expect(fetchMock).toHaveBeenCalledWith('/api/models', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('getUsage GETs /api/usage with the session id and returns usage', async () => {
    fetchMock.mockResolvedValue(mockResponse({ input: 10, output: 5, total: 15 }));

    const result = await getUsage('ses-1');

    expect(result).toEqual({ input: 10, output: 5, total: 15 });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/usage?session_id=ses-1',
      { headers: { 'Content-Type': 'application/json' } },
    );
  });

  it('getUsage returns null when the backend has no recorded usage', async () => {
    fetchMock.mockResolvedValue(mockResponse({}));

    await expect(getUsage('ses-unknown')).resolves.toBeNull();
  });

  it('enhancePrompt POSTs /api/enhance-prompt with prompt and model and returns the prompt', async () => {
    fetchMock.mockResolvedValue(mockResponse({ prompt: 'Rich, detailed prompt' }));

    const result = await enhancePrompt('make a landing page', 'openai:gpt-4o');

    expect(result).toBe('Rich, detailed prompt');
    expect(fetchMock).toHaveBeenCalledWith('/api/enhance-prompt', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ prompt: 'make a landing page', model: 'openai:gpt-4o' }),
    });
  });

  it('enhancePrompt omits the model field when none is selected', async () => {
    fetchMock.mockResolvedValue(mockResponse({ prompt: 'Rich prompt' }));

    const result = await enhancePrompt('maybe a dashboard', null);

    expect(result).toBe('Rich prompt');
    expect(fetchMock).toHaveBeenCalledWith('/api/enhance-prompt', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ prompt: 'maybe a dashboard' }),
    });
  });

  it('enhancePrompt maps a provider failure (502) to the backend detail', async () => {
    fetchMock.mockResolvedValue(mockResponse({ detail: 'llm_provider_error' }, false, 502));

    await expect(enhancePrompt('anything')).rejects.toThrow('llm_provider_error');
  });

  it('throws a human-friendly error containing the status when the response is not ok', async () => {
    fetchMock.mockResolvedValue(mockResponse('boom', false, 500));

    await expect(getProjects()).rejects.toThrow('Ошибка сервера (500)');
    await expect(getProjects()).rejects.toThrow(/500/);
  });

  it('maps HTTP 429 to a rate-limit message', async () => {
    fetchMock.mockResolvedValue(mockResponse('rate limited', false, 429));

    await expect(getProjects()).rejects.toThrow(
      'Превышен лимит запросов, попробуйте позже'
    );
  });

  it('maps network failures to a friendly message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(getProjects()).rejects.toThrow(
      'Не удалось связаться с сервером'
    );
  });

  it('testProvider POSTs /api/models/test with the model and returns the result', async () => {
    const result = { ok: true, reason: 'ok', provider: 'openai', model: 'gpt-4o' };
    fetchMock.mockResolvedValue(mockResponse(result));

    const data = await testProvider('openai:gpt-4o');

    expect(data).toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith('/api/models/test', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ model: 'openai:gpt-4o' }),
    });
  });

  it('testProvider maps a failed test (500) to a friendly error', async () => {
    fetchMock.mockResolvedValue(mockResponse('boom', false, 500));

    await expect(testProvider(null)).rejects.toThrow('Ошибка сервера (500)');
  });

  it('duplicateProject POSTs /api/projects/:id/duplicate with the name and returns the project', async () => {
    const project = {
      id: 2,
      name: 'Copy',
      prompt: 'p',
      current_code: 'c',
      session_id: 's',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    fetchMock.mockResolvedValue(mockResponse(project, true, 201));

    const result = await duplicateProject(1, 'Copy');

    expect(result).toEqual(project);
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/1/duplicate', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ name: 'Copy' }),
    });
  });

  it('duplicateProject omits the name (sends null) when none is given', async () => {
    const project = {
      id: 2,
      name: 'My Site (копия)',
      prompt: 'p',
      current_code: 'c',
      session_id: 's',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    fetchMock.mockResolvedValue(mockResponse(project, true, 201));

    await duplicateProject(1);

    expect(fetchMock).toHaveBeenCalledWith('/api/projects/1/duplicate', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ name: null }),
    });
  });

  it('duplicateProject maps a backend failure to its detail', async () => {
    fetchMock.mockResolvedValue(mockResponse({ detail: 'project_not_found' }, false, 404));

    await expect(duplicateProject(1)).rejects.toThrow('project_not_found');
  });

  it('branchFromVersion POSTs /api/projects/:id/versions/:versionId/branch and returns the project', async () => {
    const project = {
      id: 3,
      name: 'Branch',
      prompt: 'p',
      current_code: 'c',
      session_id: 's',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    fetchMock.mockResolvedValue(mockResponse(project, true, 201));

    const result = await branchFromVersion(1, 5, 'Branch');

    expect(result).toEqual(project);
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/1/versions/5/branch', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ name: 'Branch' }),
    });
  });

  it('branchFromVersion sends null when no name is given', async () => {
    const project = {
      id: 3,
      name: 'A (branch)',
      prompt: 'p',
      current_code: 'c',
      session_id: 's',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    fetchMock.mockResolvedValue(mockResponse(project, true, 201));

    await branchFromVersion(1, 5);

    expect(fetchMock).toHaveBeenCalledWith('/api/projects/1/versions/5/branch', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ name: null }),
    });
  });

  it('branchFromVersion maps a backend failure to its detail', async () => {
    fetchMock.mockResolvedValue(mockResponse({ detail: 'version_not_found' }, false, 404));

    await expect(branchFromVersion(1, 5)).rejects.toThrow('version_not_found');
  });
});

describe('instance auth', () => {
  it('attaches a stored instance token as a Bearer header', async () => {
    setInstanceToken('secret-token');
    fetchMock.mockResolvedValue(mockResponse({ items: [], total: 0, page: 1, page_size: 50 }));

    await getProjects();

    expect(fetchMock).toHaveBeenCalledWith('/api/projects', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer secret-token',
      },
    });
  });

  it('omits the Authorization header when no token is stored', async () => {
    fetchMock.mockResolvedValue(mockResponse({ items: [], total: 0, page: 1, page_size: 50 }));

    await getProjects();

    expect(fetchMock).toHaveBeenCalledWith('/api/projects', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('getInstanceInfo uses an explicit token header when one is passed', async () => {
    const info = { auth_required: true, authenticated: true, version: '1.2.3' };
    fetchMock.mockResolvedValue(mockResponse(info));

    const result = await getInstanceInfo('typed-token');

    expect(result).toEqual(info);
    expect(fetchMock).toHaveBeenCalledWith('/api/instance', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer typed-token',
      },
    });
  });

  it('notifies and throws the unauthorized error on 401', async () => {
    const onUnauthorized = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    fetchMock.mockResolvedValue(mockResponse({ detail: 'unauthorized' }, false, 401));

    await expect(getProjects()).rejects.toThrow('Для доступа к этому инстансу нужен токен');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  });

  it('exportReactProject sends auth headers and handles 401', async () => {
    setInstanceToken('secret-token');
    fetchMock.mockResolvedValue(mockResponse({ detail: 'unauthorized' }, false, 401));
    const onUnauthorized = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

    await expect(exportReactProject('<div/>')).rejects.toThrow(
      'Для доступа к этому инстансу нужен токен',
    );

    expect(fetchMock).toHaveBeenCalledWith('/api/export-react', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer secret-token',
      },
      body: JSON.stringify({ code: '<div/>', model: null }),
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  });

  it('unlockInstance stores a valid token for a protected instance', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ auth_required: true, authenticated: true, version: '1' }),
    );

    await unlockInstance('good-token');

    expect(getInstanceToken()).toBe('good-token');
    expect(fetchMock).toHaveBeenCalledWith('/api/instance', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer good-token',
      },
    });
  });

  it('unlockInstance rejects an invalid token without storing it', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ auth_required: true, authenticated: false, version: '1' }),
    );

    await expect(unlockInstance('bad-token')).rejects.toThrow(
      'Токен не подошёл. Проверьте INSTANCE_TOKEN и попробуйте снова.',
    );
    expect(getInstanceToken()).toBeNull();
  });

  it('unlockInstance stores nothing when the instance does not require auth', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ auth_required: false, authenticated: true, version: '1' }),
    );

    await expect(unlockInstance('any-token')).resolves.toBeUndefined();
    expect(getInstanceToken()).toBeNull();
  });
});
