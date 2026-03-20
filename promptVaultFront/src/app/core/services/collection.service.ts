import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Collection } from '../../models/prompt.model';

const API = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class CollectionService {
  constructor(private http: HttpClient) {}

  /** Fetch a single collection by id */
  getCollection(id: number) {
    return this.http.get<Collection>(`${API}/collections/${id}/`);
  }

  /** List all collections owned by the current user */
  getMyCollections() {
    return this.http.get<{ count: number; results: Collection[] }>(`${API}/collections/`);
  }

  /** Create a new collection */
  createCollection(data: { name: string; description?: string; icon?: string }) {
    return this.http.post<Collection>(`${API}/collections/`, data);
  }

  /** Update a collection's metadata */
  updateCollection(id: number, data: Partial<Collection>) {
    return this.http.patch<Collection>(`${API}/collections/${id}/`, data);
  }

  /** Delete a collection */
  deleteCollection(id: number) {
    return this.http.delete(`${API}/collections/${id}/`);
  }

  /** Add a prompt to a collection */
  addPrompt(collectionId: number, promptId: number) {
    return this.http.post<{ added: boolean; item_id: number }>(
      `${API}/collections/${collectionId}/add/`,
      { prompt_id: promptId }
    );
  }

  /** Remove a prompt from a collection */
  removePrompt(collectionId: number, promptId: number) {
    return this.http.delete(`${API}/collections/${collectionId}/remove/${promptId}/`);
  }

  /** Get all prompts inside a collection */
  getCollectionPrompts(collectionId: number) {
    return this.http.get<{ count: number; results: any[] }>(
      `${API}/collections/${collectionId}/prompts/`
    );
  }
}
