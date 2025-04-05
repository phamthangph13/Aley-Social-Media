import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BlockedUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
}

export interface BlockStatusResponse {
  success: boolean;
  isBlocked: boolean;
  isBlockedBy: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BlockService {
  private apiUrl = `${environment.apiUrl}/block`;

  constructor(private http: HttpClient) { }

  /**
   * Block a user
   * @param userId User ID to block
   */
  blockUser(userId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${userId}`, {});
  }

  /**
   * Unblock a user
   * @param userId User ID to unblock
   */
  unblockUser(userId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${userId}`);
  }

  /**
   * Get list of blocked users
   */
  getBlockedUsers(): Observable<{ success: boolean, blockedUsers: BlockedUser[] }> {
    return this.http.get<{ success: boolean, blockedUsers: BlockedUser[] }>(this.apiUrl);
  }

  /**
   * Check if a user is blocked
   * @param userId User ID to check
   */
  checkBlockStatus(userId: string): Observable<BlockStatusResponse> {
    return this.http.get<BlockStatusResponse>(`${this.apiUrl}/check/${userId}`);
  }
} 