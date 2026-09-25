import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://api.foodshelterconnect.org';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

const IS_WEB = Platform.OS === 'web';

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (IS_WEB) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (IS_WEB) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // ignore quota errors
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (IS_WEB) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async init() {
    this.token = await storage.getItem('auth_token');
  }

  private async getHeaders(requiresAuth: boolean): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (requiresAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { requiresAuth = false, headers, ...fetchOptions } = options;
    const url = `${this.baseUrl}${endpoint}`;
    const requestHeaders = await this.getHeaders(requiresAuth);

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...requestHeaders,
        ...headers,
      },
    });

    if (response.status === 401) {
      await this.clearAuth();
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      let message = 'Request failed';
      if (typeof error.detail === 'string') {
        message = error.detail;
      } else if (Array.isArray(error.detail)) {
        message = error.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ');
      } else if (error.detail && typeof error.detail === 'object') {
        message = error.detail.msg || error.detail.message || JSON.stringify(error.detail);
      }
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async setAuth(token: string, user: User) {
    this.token = token;
    await storage.setItem('auth_token', token);
    await storage.setItem('auth_user', JSON.stringify(user));
  }

  async clearAuth() {
    this.token = null;
    await storage.deleteItem('auth_token');
    await storage.deleteItem('auth_user');
  }

  async getStoredUser(): Promise<User | null> {
    const userStr = await storage.getItem('auth_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.user) {
      await this.setAuth(response.access_token, response.user);
    }
    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.user) {
      await this.setAuth(response.access_token, response.user);
    }
    return response;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/users/me', { requiresAuth: true });
  }

  async updateMe(data: Partial<User>): Promise<User> {
    return this.request<User>('/users/me', {
      method: 'PATCH',
      requiresAuth: true,
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    await this.clearAuth();
  }

  async analyzeFoodImage(imageUri: string): Promise<FoodVisionResponse> {
    const formData = new FormData();
    const filename = `food_${Date.now()}.jpg`;
    const source = await toUploadSource(imageUri);
    formData.append('file', source as any);

    const url = `${this.baseUrl}/vision/food/analyze`;
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401) {
      await this.clearAuth();
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      let message = 'Request failed';
      if (typeof error.detail === 'string') {
        message = error.detail;
      } else if (Array.isArray(error.detail)) {
        message = error.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ');
      } else if (error.detail && typeof error.detail === 'object') {
        message = error.detail.msg || error.detail.message || JSON.stringify(error.detail);
      }
      throw new Error(message);
    }

    return response.json();
  }
}

// Convert a picked image URI into a form-data-ready upload source.
// On web, expo-image-picker returns a base64 `data:` URI or a `blob:` URI;
// fetch() cannot read `data:` URIs, so we decode those manually.
async function toUploadSource(imageUri: string): Promise<Blob | { uri: string; name: string; type: string }> {
  if (Platform.OS !== 'web') {
    return { uri: imageUri, name: `food_${Date.now()}.jpg`, type: 'image/jpeg' };
  }
  if (imageUri.startsWith('data:')) {
    const comma = imageUri.indexOf(',');
    const header = imageUri.slice(0, comma);
    const base64Data = imageUri.slice(comma + 1);
    const mime = header.match(/^data:(.*?)(;|$)/)?.[1] || 'image/jpeg';
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  const res = await fetch(imageUri);
  return res.blob();
}

export type DietaryTag = 'Veg' | 'Non-Veg' | 'Egg';

export interface FoodVisionItem {
  title: string;
  category: string;
  food_type: 'COOKED' | 'RAW' | 'PACKAGED' | 'BAKED';
  dietary_tag: DietaryTag;
  egg_quantity: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoning?: string | null;
}

export interface FoodVisionResponse {
  success: boolean;
  source: 'upload' | 'url';
  filename?: string | null;
  item: FoodVisionItem;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: string;
  user_id: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'donor' | 'shelter' | 'volunteer' | 'admin';
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  trust_score: number;
  is_trusted: boolean;
  donor_profile?: DonorProfile;
  shelter_profile?: ShelterProfile;
  volunteer_profile?: VolunteerProfile;
}

export interface DonorProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  address: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  pickup_window_start: string;
  pickup_window_end: string;
  trust_score: number;
}

export interface ShelterProfile {
  id: string;
  user_id: string;
  shelter_name: string;
  category: string;
  address: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  max_capacity_meals: number;
  contact_person: string;
  contact_phone: string;
}

export interface VolunteerProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  vehicle_type: string;
  service_radius_km: number;
  is_online: boolean;
  current_latitude?: number;
  current_longitude?: number;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'DONOR' | 'SHELTER' | 'VOLUNTEER' | 'donor' | 'shelter' | 'volunteer';
}

export const api = new ApiClient(API_BASE_URL);