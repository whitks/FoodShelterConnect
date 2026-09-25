const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: 'donor' | 'shelter' | 'volunteer' | 'admin';
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  trust_score: number;
  is_trusted: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: string;
  user_id: string;
  user: User;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    if (options.headers) {
      const optHeaders = new Headers(options.headers);
      optHeaders.forEach((value, key) => headers.set(key, value));
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearAuth();
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  setAuth(token: string, user: User) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  clearAuth() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.user) {
      this.setAuth(response.access_token, response.user);
    }
    return response;
  }

  async register(data: { email: string; password: string; name: string; phone: string; role: 'donor' | 'shelter' | 'volunteer' }): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.user) {
      this.setAuth(response.access_token, response.user);
    }
    return response;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/users/me');
  }

  logout() {
    this.clearAuth();
  }
}

export const api = new ApiClient(API_BASE_URL);