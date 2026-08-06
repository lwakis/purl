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

export interface Project {
  id: number;
  name: string;
  prompt: string;
  current_code: string;
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
  code: string;
  message: string;
  created_at: string;
}

export interface PromptTemplate {
  id: number;
  title: string;
  description: string;
  prompt_text: string;
  category: string;
  icon: string;
}

export type SSEEventType = 'analysis' | 'design' | 'code' | 'complete' | 'error';

export interface SSEEvent {
  type: SSEEventType;
  content: string;
}

export type PreviewSize = 'desktop' | 'tablet' | 'mobile';
export type ThemeMode = 'light' | 'dark' | 'auto';
export type DesignStyle = 'minimal' | 'corporate' | 'playful' | 'techno';
export type ActivePanel = 'code' | 'chat';
