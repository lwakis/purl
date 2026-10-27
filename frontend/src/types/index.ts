export interface GenerateRequest {
  prompt: string;
  session_id?: string | null;
  model?: string | null;
  plan?: boolean;
  images?: string[];
  preset?: string | null;
}

export interface IterateRequest {
  session_id: string;
  message: string;
  current_code: string;
  history: ChatMessage[];
  model?: string | null;
  plan?: boolean;
  images?: string[];
  selected_element?: string | null;
  preset?: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Code and prompt come from the API as nullable (str | None): a project can be
// created empty and only later receive generated HTML. The UI normalizes them
// to '' at the store boundary (see ProjectSidebar.handleLoadProject), so callers
// can rely on the store keeping plain strings.
export interface Project {
  id: number;
  name: string;
  prompt: string | null;
  current_code: string | null;
  session_id: string;
  preset: string | null;
  created_at: string;
  updated_at: string;
}

export interface PresetInfo {
  id: string;
  name: { ru: string; en: string };
  description: { ru: string; en: string };
  swatch: [string, string, string];
}

export interface ProjectVersion {
  id: number;
  project_id: number;
  version_num: number;
  code: string | null;
  message: string;
  created_at: string;
}

export type SSEEventType = 'analysis' | 'design' | 'code' | 'complete' | 'error';

export interface SSEEvent {
  type: SSEEventType;
  content: string;
}

export type PreviewSize = 'desktop' | 'tablet' | 'mobile';
export type WorkspaceView = 'preview' | 'code';
export type Locale = 'ru' | 'en';

export interface ModelInfo {
  id: string;
  label: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  models: ModelInfo[];
  ready: boolean;
}

export interface ProviderTestResult {
  ok: boolean;
  reason: 'ok' | 'mock' | 'error';
  provider: string | null;
  model: string | null;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
}

export interface SelectedElement {
  tag: string;
  id: string | null;
  classes: string[];
  text: string;
  selector: string;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface PaginatedProjects {
  items: Project[];
  total: number;
  page: number;
  page_size: number;
}

export interface InstanceInfo {
  auth_required: boolean;
  authenticated: boolean;
  version: string;
}
