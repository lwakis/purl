import type { Project, ProjectVersion, PromptTemplate } from '../types';
import { getToken } from './session';
import { t } from '../i18n';

// API base URL. Empty (default) = same origin as the frontend
// (Vite dev proxy or a reverse proxy in production).
export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });
  } catch {
    throw new Error(t('errors.network'));
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

export async function fetchTemplates(): Promise<PromptTemplate[]> {
  return request<PromptTemplate[]>('/api/templates');
}

export async function createProject(data: {
  name: string;
  prompt: string;
  current_code: string;
  theme: string;
  style: string;
  session_id: string;
}): Promise<Project> {
  return request<Project>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getProjects(sessionId?: string): Promise<Project[]> {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
  return request<Project[]>(`/api/projects${query}`);
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
  const params = new URLSearchParams({ code });
  if (message) params.set('message', message);
  return request<ProjectVersion>(`/api/projects/${projectId}/versions?${params.toString()}`, {
    method: 'POST',
  });
}

export async function createShareLink(
  projectId: number,
): Promise<{ short_code: string; url: string }> {
  return request<{ short_code: string; url: string }>('/api/share', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId }),
  });
}

export async function getSharedProject(code: string): Promise<{
  name: string;
  code: string;
}> {
  return request<{ name: string; code: string }>(`/api/share/${code}`);
}

export async function createAnonSession(): Promise<{
  token: string;
  session_id: string;
}> {
  return request<{ token: string; session_id: string }>('/api/auth/anon', {
    method: 'POST',
  });
}
