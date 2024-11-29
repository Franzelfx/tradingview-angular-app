// src/app/services/auth.service.ts

import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpErrorResponse,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  exp: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'accessToken';
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) {}

  async login(username: string, password: string): Promise<string | null> {
    try {
      const params = new HttpParams()
        .set('username', username)
        .set('password', password);

      const response = await this.http
        .post<{ access_token: string }>(
          `${this.apiUrl}/auth/token`,
          params.toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        )
        .toPromise();

      if (response?.access_token) {
        localStorage.setItem(this.tokenKey, response.access_token);
        return null; // No error
      } else {
        return 'Login failed. Please try again.';
      }
    } catch (error) {
      console.error('Login failed:', error);
      if (error instanceof HttpErrorResponse && error.error?.detail) {
        return error.error.detail;
      }
      return 'An unexpected error occurred during login.';
    }
  }

  async register(
    username: string,
    email: string,
    password: string
  ): Promise<string | null> {
    try {
      const response = await this.http
        .post<{ message: string }>(`${this.apiUrl}/auth/register`, {
          username,
          email,
          password,
        })
        .toPromise();

      // Registration successful
      return response?.message || null;
    } catch (error) {
      console.error('Registration failed:', error);
      if (error instanceof HttpErrorResponse && error.error?.detail) {
        return error.error.detail;
      }
      return 'An unexpected error occurred during registration.';
    }
  }

  async requestPasswordReset(email: string): Promise<string | null> {
    try {
      const response = await this.http
        .post<{ message: string }>(
          `${this.apiUrl}/auth/request-password-reset`,
          { email }
        )
        .toPromise();

      // If the response is successful
      return null;
    } catch (error) {
      console.error('Password reset request failed:', error);
      if (error instanceof HttpErrorResponse && error.error?.detail) {
        return error.error.detail;
      }
      return 'An unexpected error occurred during password reset request.';
    }
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<string | null> {
    try {
      const response = await this.http
        .post<{ message: string }>(`${this.apiUrl}/auth/reset-password`, {
          token,
          new_password: newPassword,
        })
        .toPromise();

      return null;
    } catch (error) {
      console.error('Password reset failed:', error);
      if (error instanceof HttpErrorResponse && error.error?.detail) {
        return error.error.detail;
      }
      return 'An unexpected error occurred during password reset.';
    }
  }

  async verifyEmail(token: string): Promise<string | null> {
    try {
      const response = await this.http
        .get<{ message: string }>(`${this.apiUrl}/auth/verify-email`, {
          params: { token },
        })
        .toPromise();

      return null;
    } catch (error) {
      console.error('Email verification failed:', error);
      if (error instanceof HttpErrorResponse && error.error?.detail) {
        return error.error.detail;
      }
      return 'An unexpected error occurred during email verification.';
    }
  }

  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await this.http
          .post(
            `${this.apiUrl}/auth/logout`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .toPromise();
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
    localStorage.removeItem(this.tokenKey);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      return false;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const currentTime = Math.floor(new Date().getTime() / 1000);
      if (decoded.exp < currentTime) {
        this.logout();
        return false;
      }
      return true;
    } catch (error) {
      console.error('Invalid token:', error);
      this.logout();
      return false;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
}
