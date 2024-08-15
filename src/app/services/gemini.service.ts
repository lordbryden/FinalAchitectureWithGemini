import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private apiUrl = 'https://pythongemini-3.onrender.com/generate'; // URL to Flask API
  // private apiUrl = 'http://127.0.0.1:5000/generate'
  constructor(private http: HttpClient) { }
  generateContent(userInput: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = { input: userInput };

    return this.http.post<any>(this.apiUrl, body, { headers });
  }
}
