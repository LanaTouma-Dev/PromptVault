import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AITool } from '../../models/prompt.model';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AIToolService {
  constructor(private http: HttpClient) {}

  getTools() {
    return this.http.get<{ results: AITool[] }>(`${API}/ai-tools/`);
  }
}
