import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  getProjectVersions,
  getModels,
  getUsage,
} from './api';

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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('createProject POSTs /api/projects with the full JSON body', async () => {
    const project = {
      id: 1,
      name: 'My Site',
      prompt: 'Build a landing page',
      current_code: '<div/>',
      theme: 'dark',
      style: 'minimal',
      session_id: 'sess-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    fetchMock.mockResolvedValue(mockResponse(project));

    const data = {
      name: 'My Site',
      prompt: 'Build a landing page',
      current_code: '<div/>',
      theme: 'dark',
      style: 'minimal',
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

  it('getProjects GETs /api/projects and returns the list', async () => {
    const projects = [
      {
        id: 1,
        name: 'A',
        prompt: 'p',
        current_code: 'c',
        theme: 'dark',
        style: 'minimal',
        session_id: 's',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];
    fetchMock.mockResolvedValue(mockResponse(projects));

    const result = await getProjects();

    expect(result).toEqual(projects);
    expect(fetchMock).toHaveBeenCalledWith('/api/projects', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('getProject GETs /api/projects/:id', async () => {
    const project = {
      id: 7,
      name: 'A',
      prompt: 'p',
      current_code: 'c',
      theme: 'dark',
      style: 'minimal',
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
      theme: 'dark',
      style: 'minimal',
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
});
