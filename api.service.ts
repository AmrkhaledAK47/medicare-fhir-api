import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

// Define the base API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Define interfaces for authentication
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  repeatPassword: string;
  accessCode: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  resetCode: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'patient' | 'practitioner';
  status: string;
  fhirResourceId?: string;
  fhirResourceType?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers['Authorization'] = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const apiError: ApiError = {
          message: error.message || 'An unknown error occurred',
          statusCode: error.response?.status || 500,
        };

        if (error.response?.data) {
          const data = error.response.data as any;
          apiError.message = data.message || apiError.message;
          apiError.error = data.error;
        }

        return Promise.reject(apiError);
      }
    );

    // Initialize token from localStorage if available (client-side only)
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        this.setToken(storedToken);
      }
    }
  }

  // Set authentication token
  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  // Clear authentication token
  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // Authentication methods
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/auth/login', credentials);
      this.setToken(response.data.accessToken);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async signup(userData: SignupRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/auth/register', userData);
      this.setToken(response.data.accessToken);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
    try {
      const response = await this.api.post<{ message: string }>('/auth/forgot-password', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    try {
      const response = await this.api.post<{ message: string }>('/auth/reset-password', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async verifyCode(data: VerifyCodeRequest): Promise<{ isValid: boolean; role?: string }> {
    try {
      const response = await this.api.post<{ isValid: boolean; role?: string }>('/access-codes/verify', {
        code: data.code,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getUserProfile(): Promise<User> {
    try {
      const response = await this.api.get<User>('/auth/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Logout method
  logout(): void {
    this.clearToken();
  }
}

// Create a singleton instance
const apiService = new ApiService();
export default apiService;
