import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = `${environment.apiUrl}/profile`;

  constructor(private http: HttpClient) { }

  /**
   * Get current user profile
   */
  getProfile(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  /**
   * Get profile by user ID
   * @param userId User ID
   */
  getProfileById(userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${userId}`);
  }

  /**
   * Update user profile
   * @param profileData Profile data to update
   */
  updateProfile(profileData: any): Observable<any> {
    return this.http.put<any>(this.apiUrl, profileData);
  }

  /**
   * Upload or update avatar
   * @param file Image file to upload
   */
  updateAvatar(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.put<any>(`${this.apiUrl}/avatar`, formData);
  }

  /**
   * Delete avatar (reset to default)
   */
  deleteAvatar(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/avatar`);
  }

  /**
   * Upload or update cover image
   * @param file Image file to upload
   */
  updateCoverImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('coverImage', file);

    return this.http.put<any>(`${this.apiUrl}/cover`, formData);
  }

  /**
   * Delete cover image (reset to default)
   */
  deleteCoverImage(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/cover`);
  }
} 