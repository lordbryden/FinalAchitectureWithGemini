// auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Plugins } from '@capacitor/core';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';
const { GoogleAuth } = Plugins;


interface TokenResponse {
  access_token: string;
  // Add other properties if your response includes them
}
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private http: HttpClient) {}
  async getAccessToken(): Promise<string> {
    let token = localStorage.getItem('access_token');
    if (!token) {
      token = await this.fetchNewToken();
    }
    return token;
  }

  private async fetchNewToken(): Promise<string> {
    try {
      const response = await this.http.post<TokenResponse>('721266053844-qtu0t8dv3r2jans0jbp3ihhfteh2c708.apps.googleusercontent.com ', {}).toPromise();
      if (response && response.access_token) {
        localStorage.setItem('access_token', response.access_token);
        return response.access_token;
      } else {
        throw new Error('Invalid token response');
      }
    } catch (error) {
      console.error('Error fetching token:', error);
      throw error;
    }
  }

  async refreshToken(): Promise<void> {
    await this.fetchNewToken();
  }
}
