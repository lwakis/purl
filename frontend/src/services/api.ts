import type { Project, ProjectVersion } from '../types';
import { t } from '../i18n';

// API base URL. Empty (default) = same origin as the frontend
// (Vite dev proxy or a reverse proxy in production).
export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
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
  return request<ProjectVersion>(`/api/projects/${projectId}/versions`, {
    method: 'POST',
    body: JSON.stringify({ code, message }),
  });
}
