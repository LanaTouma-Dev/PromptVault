import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Category } from '../../models/prompt.model';

const API = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  constructor(private http: HttpClient) {}

  getCategories() {
    return this.http.get<{ results: Category[] }>(`${API}/categories/`);
  }
}
