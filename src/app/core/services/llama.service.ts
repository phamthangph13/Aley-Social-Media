import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LlamaService {
  // API endpoint for FastAPI Llama service
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {
    // Log API URL để debug
    console.log('LlamaService initialized with API URL:', this.apiUrl);
  }

  /**
   * Send a message to Llama 3 and get a response
   * @param message User's message
   * @returns Observable with the Llama 3 response
   */
  sendMessage(message: string): Observable<any> {
    const payload = {
      message,
      temperature: 1.0,
      max_tokens: 1024,
      top_p: 1.0,
      stream: false
    };

    return this.http.post<any>(`${this.apiUrl}/chat`, payload)
      .pipe(
        catchError(error => {
          console.error('Error in Llama 3 service:', error);
          return throwError(() => new Error('Không thể kết nối với Llama 3. Vui lòng thử lại sau.'));
        })
      );
  }
} 