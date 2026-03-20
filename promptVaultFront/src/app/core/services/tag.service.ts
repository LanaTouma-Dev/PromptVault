import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Tag, PaginatedResponse } from '../../models/prompt.model';

const API = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class TagService {
  constructor(private http: HttpClient) {}

  getTags() {
    return this.http.get<PaginatedResponse<Tag>>(`${API}/tags/`);
  }
}
