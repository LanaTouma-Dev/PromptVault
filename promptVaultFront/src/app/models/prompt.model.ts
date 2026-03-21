export interface Category {
  id: number; name: string; slug: string; color: string; icon: string; order: number; prompt_count: number;
}
export interface Tag { id: number; name: string; slug: string; }
export interface AITool { id: number; name: string; slug: string; provider: string; pricing: 'free' | 'freemium' | 'paid'; color: string; }
export interface Author {
  id: number; username: string; first_name: string; last_name: string;
  reputation: number;
  profile?: { avatar_url: string; bio: string; role: string };
}
export interface ForkOrigin { id: number; title: string; author: { id: number; username: string } | null; }

export interface Prompt {
  id: number; title: string; description: string; content: string; variables: string[];
  author: Author; category: Category | null; tags: Tag[]; compatible_tools: AITool[];
  visibility: 'shared' | 'private'; is_hot: boolean;
  vote_count: number; copy_count: number; fork_count: number;
  forked_from: ForkOrigin | null;
  comment_count?: number;
  created_at: string; updated_at: string; has_voted: boolean;
}

export interface Comment {
  id: number; prompt: number; author: Author; parent: number | null;
  body: string; replies: Comment[]; created_at: string; updated_at: string;
}

export interface PaginatedResponse<T> { count: number; next: string | null; previous: string | null; results: T[]; }
export interface PromptFilters { search?: string; category?: string; tag?: string; ordering?: string; hot?: boolean; page?: number; }

export interface Collection {
  id: number; name: string; description: string; icon: string; is_public: boolean;
  prompt_count: number; preview_prompts: { id: number; title: string }[];
  owner_username: string; created_at: string; updated_at: string;
}

export interface PublicProfile {
  id: number; username: string; first_name: string; last_name: string;
  reputation: number; prompt_count: number; fork_count: number; date_joined: string;
  profile?: { avatar_url: string; bio: string; role: string };
}
