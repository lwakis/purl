import type {
  InstanceInfo,
  Project,
  ProjectVersion,
  PresetInfo,
  ProviderInfo,
  ProviderTestResult,
  TokenUsage,
  PaginatedProjects,
} from '../types';
import { t } from '../i18n';
import { instanceAuthHeaders, notifyUnauthorized, setInstanceToken } from './instanceAuth';

// API base URL. Empty (default) = same origin as the frontend
// (Vite dev proxy or a reverse proxy in production).
export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...instanceAuthHeaders(),
        ...(options?.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new Error(t('errors.network'));
  }

  if (response.status === 401) {
    notifyUnauthorized();
    throw new Error(t('errors.unauthorized'));
  }

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    if (response.status === 429) {
      throw new Error(t('errors.rateLimit'));
    }
    let detail = '';
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.detail === 'string') detail = parsed.detail;
    } catch {
      // body is not JSON — ignore raw technical body
    }
    throw new Error(detail || t('errors.serverError', { status: response.status }));
  }

  return response.json();
}

export async function getInstanceInfo(token?: string): Promise<InstanceInfo> {
  return request<InstanceInfo>(
    '/api/instance',
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );
}

/**
 * Validate a token against the running backend before storing it.
 * A backend without INSTANCE_TOKEN configured accepts anything (auth not
 * required), so the token is simply not persisted.
 */
export async function unlockInstance(token: string): Promise<void> {
  const info = await getInstanceInfo(token);
  if (!info.auth_required) return;
  if (!info.authenticated) {
    throw new Error(t('gate.invalidToken'));
  }
  setInstanceToken(token);
}

export async function createProject(data: {
  name: string;
  prompt: string;
  current_code: string;
  session_id: string;
  preset?: string | null;
}): Promise<Project> {
  return request<Project>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function duplicateProject(projectId: number, name?: string): Promise<Project> {
  return request<Project>(`/api/projects/${projectId}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ name: name ?? null }),
  });
}

export async function getProjects(
  sessionId?: string,
  params?: { search?: string; page?: number; pageSize?: number },
): Promise<PaginatedProjects> {
  const query = new URLSearchParams();
  if (sessionId) query.set('session_id', sessionId);
  if (params?.search) query.set('q', params.search);
  if (params?.page && params.page > 1) query.set('page', String(params.page));
  if (params?.pageSize) query.set('page_size', String(params.pageSize));
  const qs = query.toString();
  return request<PaginatedProjects>(`/api/projects${qs ? `?${qs}` : ''}`);
}

export async function getModels(): Promise<ProviderInfo[]> {
  const data = await request<{ providers: ProviderInfo[] }>('/api/models');
  return data.providers;
}

export async function getPresets(): Promise<PresetInfo[]> {
  const data = await request<{ presets: PresetInfo[] }>('/api/presets');
  return data.presets;
}

export async function testProvider(model: string | null): Promise<ProviderTestResult> {
  return request<ProviderTestResult>('/api/models/test', {
    method: 'POST',
    body: JSON.stringify({ model }),
  });
}

export async function getProject(id: number): Promise<Project> {
  return request<Project>(`/api/projects/${id}`);
}

export async function updateProject(id: number, data: Partial<Project>): Promise<Project> {
  return request<Project>(`/api/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: number): Promise<void> {
  await request<void>(`/api/projects/${id}`, {
    method: 'DELETE',
  });
}

export async function getProjectVersions(id: number): Promise<ProjectVersion[]> {
  return request<ProjectVersion[]>(`/api/projects/${id}/versions`);
}

export async function saveProjectVersion(
  projectId: number,
  code: string,
  message?: string,
): Promise<ProjectVersion> {
  return request<ProjectVersion>(`/api/projects/${projectId}/versions`, {
    method: 'POST',
    body: JSON.stringify({ code, message }),
  });
}

export async function branchFromVersion(
  projectId: number,
  versionId: number,
  name?: string,
): Promise<Project> {
  return request<Project>(`/api/projects/${projectId}/versions/${versionId}/branch`, {
    method: 'POST',
    body: JSON.stringify({ name: name ?? null }),
  });
}

export async function enhancePrompt(prompt: string, model?: string | null): Promise<string> {
  const data = await request<{ prompt: string }>('/api/enhance-prompt', {
    method: 'POST',
    body: JSON.stringify(model ? { prompt, model } : { prompt }),
  });
  return data.prompt;
}

export async function exportReactProject(code: string, model?: string | null): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/export-react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...instanceAuthHeaders() },
      body: JSON.stringify({ code, model: model ?? null }),
    });
  } catch {
    throw new Error(t('errors.network'));
  }

  if (response.status === 401) {
    notifyUnauthorized();
    throw new Error(t('errors.unauthorized'));
  }

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    if (response.status === 429) {
      throw new Error(t('errors.rateLimit'));
    }
    let detail = '';
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.detail === 'string') detail = parsed.detail;
    } catch {
      // body is not JSON — ignore raw technical body
    }
    throw new Error(detail || t('errors.serverError', { status: response.status }));
  }

  return response.blob();
}

export async function getUsage(sessionId: string): Promise<TokenUsage | null> {
  const path = `/api/usage?session_id=${encodeURIComponent(sessionId)}`;
  const data = await request<Partial<TokenUsage>>(path);
  if (data.input === undefined && data.output === undefined) {
    return null;
  }
  return {
    input: data.input ?? 0,
    output: data.output ?? 0,
    total: data.total ?? (data.input ?? 0) + (data.output ?? 0),
  };
}
