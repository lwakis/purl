export interface GenerateRequest {
  prompt: string;
  theme?: 'light' | 'dark' | 'auto';
  style?: 'minimal' | 'corporate' | 'playful' | 'techno';
}

export interface IterateRequest {
  session_id: string;
  message: string;
  current_code: string;
  history: ChatMessage[];
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
  theme: string;
  style: string;
  session_id: string;
  created_at: string;
  updated_at: string;
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
export type ActivePanel = 'code' | 'chat';
export type Locale = 'ru' | 'en';
