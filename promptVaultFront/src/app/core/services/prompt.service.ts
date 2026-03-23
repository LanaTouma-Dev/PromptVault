import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Comment, Prompt, PaginatedResponse, PromptFilters, PublicProfile } from '../../models/prompt.model';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class PromptService {
  constructor(private http: HttpClient) {}

  getPrompts(filters: PromptFilters = {}) {
    let params = new HttpParams();
    if (filters.search)                               params = params.set('search',    filters.search);
    if (filters.category && filters.category !== 'all') params = params.set('category', filters.category);
    if (filters.tag)                                  params = params.set('tag',       filters.tag);
    if (filters.ordering)                             params = params.set('ordering',  filters.ordering);
    if (filters.hot)                                  params = params.set('hot',       'true');
    if (filters.page)                                 params = params.set('page',      filters.page.toString());
    return this.http.get<PaginatedResponse<Prompt>>(`${API}/prompts/`, { params });
  }

  getMyPrompts() {
    const params = new HttpParams().set('ordering', '-created_at').set('page_size', '200');
    return this.http.get<PaginatedResponse<Prompt>>(`${API}/prompts/`, { params });
  }

  getMyOwnPrompts() {
    const params = new HttpParams().set('mine', 'true').set('ordering', '-created_at').set('page_size', '200');
    return this.http.get<PaginatedResponse<Prompt>>(`${API}/prompts/`, { params });
  }

  getMyForks() {
    const params = new HttpParams().set('forked', 'true').set('ordering', '-created_at').set('page_size', '200');
    return this.http.get<PaginatedResponse<Prompt>>(`${API}/prompts/`, { params });
  }

  getPrompt(id: number) { return this.http.get<Prompt>(`${API}/prompts/${id}/`); }
  createPrompt(data: Record<string, unknown>) { return this.http.post<Prompt>(`${API}/prompts/`, data); }
  updatePrompt(id: number, data: Record<string, unknown>) { return this.http.patch<Prompt>(`${API}/prompts/${id}/`, data); }
  deletePrompt(id: number) { return this.http.delete(`${API}/prompts/${id}/`); }

  upvote(id: number)    { return this.http.post<{ voted: boolean; vote_count: number }>(`${API}/prompts/${id}/upvote/`, {}); }
  trackCopy(id: number) { return this.http.post<{ copy_count: number }>(`${API}/prompts/${id}/copy/`, {}); }

  // ── Forking ────────────────────────────────────────────────────────────────
  forkPrompt(id: number) { return this.http.post<Prompt>(`${API}/prompts/${id}/fork/`, {}); }
  getForks(id: number)   { return this.http.get<PaginatedResponse<Prompt>>(`${API}/prompts/${id}/forks/`); }

  // ── Comments ───────────────────────────────────────────────────────────────
  getComments(promptId: number) {
    return this.http.get<{ count: number; results: Comment[] }>(`${API}/prompts/${promptId}/comments/`);
  }
  addComment(promptId: number, body: string, parentId?: number) {
    return this.http.post<Comment>(`${API}/prompts/${promptId}/comments/add/`, {
      body,
      ...(parentId ? { parent_id: parentId } : {}),
    });
  }
  deleteComment(commentId: number) { return this.http.delete(`${API}/comments/${commentId}/`); }

  // ── Public profile ─────────────────────────────────────────────────────────
  getPublicProfile(username: string) { return this.http.get<PublicProfile>(`${API}/profile/${username}/`); }
}
