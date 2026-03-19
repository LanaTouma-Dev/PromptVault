import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Prompt, PaginatedResponse, PromptFilters } from '../../models/prompt.model';

const API = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class PromptService {
  constructor(private http: HttpClient) {}

  getPrompts(filters: PromptFilters = {}) {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.category && filters.category !== 'all') params = params.set('category', filters.category);
    if (filters.tag) params = params.set('tag', filters.tag);
    if (filters.ordering) params = params.set('ordering', filters.ordering);
    if (filters.hot) params = params.set('hot', 'true');
    if (filters.page) params = params.set('page', filters.page.toString());
    return this.http.get<PaginatedResponse<Prompt>>(`${API}/prompts/`, { params });
  }

  getPrompt(id: number) {
    return this.http.get<Prompt>(`${API}/prompts/${id}/`);
  }

  createPrompt(data: Partial<Prompt>) {
    return this.http.post<Prompt>(`${API}/prompts/`, data);
  }

  updatePrompt(id: number, data: Partial<Prompt>) {
    return this.http.patch<Prompt>(`${API}/prompts/${id}/`, data);
  }

  deletePrompt(id: number) {
    return this.http.delete(`${API}/prompts/${id}/`);
  }

  upvote(id: number) {
    return this.http.post<{ voted: boolean; vote_count: number }>(`${API}/prompts/${id}/upvote/`, {});
  }

  trackCopy(id: number) {
    return this.http.post<{ copy_count: number }>(`${API}/prompts/${id}/copy/`, {});
  }
}
