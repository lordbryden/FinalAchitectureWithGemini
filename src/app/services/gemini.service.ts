import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private apiUrl = 'https://api.gemini.com/v1/your-endpoint';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  async callModel(inputData: any): Promise<any> {
    const token = await this.authService.getAccessToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(this.apiUrl, inputData, { headers }).toPromise();
  }
}
