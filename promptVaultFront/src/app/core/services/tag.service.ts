import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Tag, PaginatedResponse } from '../../models/prompt.model';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class TagService {
  constructor(private http: HttpClient) {}

  getTags() {
    return this.http.get<PaginatedResponse<Tag>>(`${API}/tags/`);
  }
}
