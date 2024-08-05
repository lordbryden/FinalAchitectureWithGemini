import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private apiUrl = 'http://localhost:5000/generate'; // URL to Flask API
  constructor(private http: HttpClient) { }
  generateContent(userInput: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = { input: userInput };

    return this.http.post<any>(this.apiUrl, body, { headers });
  }
}
