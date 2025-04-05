import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private apiUrl = `${environment.apiUrl}/search`;

  constructor(private http: HttpClient) { }

  // Search for everything (users and posts)
  search(query: string): Observable<any> {
    return this.http.get(`${this.apiUrl}`, { params: { q: query } });
  }

  // Search for users only
  searchUsers(query: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/users`, { params: { q: query } });
  }

  // Search for posts only
  searchPosts(query: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/posts`, { params: { q: query } });
  }
} 