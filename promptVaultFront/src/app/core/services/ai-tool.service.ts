import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AITool } from '../../models/prompt.model';

const API = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class AIToolService {
  constructor(private http: HttpClient) {}

  getTools() {
    return this.http.get<{ results: AITool[] }>(`${API}/ai-tools/`);
  }
}
