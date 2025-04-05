import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private apiUrl = `${environment.apiUrl}/posts`;

  constructor(private http: HttpClient) { }

  // Get all posts with pagination
  getPosts(page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}?page=${page}&limit=${limit}`);
  }

  // Get posts by user ID
  getPostsByUser(userId: string, page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}?userId=${userId}&page=${page}&limit=${limit}`);
  }

  // Get user profile posts with privacy handling
  getUserProfilePosts(userId: string, page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/${userId}?page=${page}&limit=${limit}`);
  }

  // Get a specific post by ID
  getPostById(postId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${postId}`);
  }

  // Create a new post
  createPost(postData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, postData);
  }

  // Update a post
  updatePost(postId: string, postData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${postId}`, postData);
  }

  // Delete a post
  deletePost(postId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${postId}`);
  }

  // Like/unlike a post
  toggleLike(postId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${postId}/like`, {});
  }

  // Add a comment to a post
  addComment(postId: string, text: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${postId}/comments`, { text });
  }
} 