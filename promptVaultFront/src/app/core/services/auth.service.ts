import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';

const API = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<any>(null);
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());

  constructor(private http: HttpClient) {
    const token = localStorage.getItem('access_token');
    if (token) this.loadMe();
  }

  login(username: string, password: string) {
    return this.http.post<{ access: string; refresh: string }>(`${API}/auth/token/`, { username, password }).pipe(
      tap(res => {
        localStorage.setItem('access_token', res.access);
        localStorage.setItem('refresh_token', res.refresh);
        this.loadMe();
      })
    );
  }

  register(data: { username: string; email: string; password: string; password2: string }) {
    return this.http.post(`${API}/auth/register/`, data);
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this._user.set(null);
  }

  private loadMe() {
    this.http.get(`${API}/auth/me/`).subscribe({
      next: (u) => this._user.set(u),
      error: () => this.logout(),
    });
  }
}
