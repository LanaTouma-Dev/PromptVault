export interface Category {
  id: number;
  name: string;
  slug: string;
  color: string;
  icon: string;
  order: number;
  prompt_count: number;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface AITool {
  id: number;
  name: string;
  slug: string;
  provider: string;
  pricing: 'free' | 'freemium' | 'paid';
  color: string;
}

export interface Author {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  profile?: { avatar_url: string; bio: string; role: string };
}

export interface Prompt {
  id: number;
  title: string;
  description: string;
  content?: string;
  variables: string[];
  author: Author;
  category: Category | null;
  tags: Tag[];
  compatible_tools: AITool[];
  visibility: 'shared' | 'private';
  is_hot: boolean;
  vote_count: number;
  copy_count: number;
  created_at: string;
  updated_at: string;
  has_voted: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PromptFilters {
  search?: string;
  category?: string;
  tag?: string;
  ordering?: string;
  hot?: boolean;
  page?: number;
}
