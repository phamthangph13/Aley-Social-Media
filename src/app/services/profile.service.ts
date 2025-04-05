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
   * Update notification preferences
   * @param preferences Notification preferences to update
   */
  updateNotificationPreferences(preferences: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/notifications`, preferences);
  }

  /**
   * Update privacy settings
   * @param settings Privacy settings to update
   */
  updatePrivacySettings(settings: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/privacy`, settings);
  }

  /**
   * Get list of blocked users
   */
  getBlockedUsers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/blocked-users`);
  }

  /**
   * Block a user
   * @param userId User ID to block
   */
  blockUser(userId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/block-user`, { userId });
  }

  /**
   * Unblock a user
   * @param userId User ID to unblock
   */
  unblockUser(userId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/blocked-users/${userId}`);
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