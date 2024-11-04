// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

  async login(username: string, password: string): Promise<boolean> {
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
        this.router.navigate(['/']);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
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
