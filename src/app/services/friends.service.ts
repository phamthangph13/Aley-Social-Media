import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FriendsService {
  private apiUrl = `${environment.apiUrl}/friends`;

  constructor(private http: HttpClient) { }

  // Get all friends
  getFriends(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  // Get friend requests
  getFriendRequests(): Observable<any> {
    return this.http.get(`${this.apiUrl}/requests`).pipe(
      catchError(error => {
        console.error('Error fetching friend requests:', error);
        return throwError(() => error);
      })
    );
  }

  // Get friend suggestions
  getFriendSuggestions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/suggestions`);
  }

  // Get sent friend requests
  getSentFriendRequests(): Observable<any> {
    return this.http.get(`${this.apiUrl}/sent-requests`).pipe(
      catchError(error => {
        console.error('Error fetching sent requests:', error);
        return throwError(() => error);
      })
    );
  }

  // Send friend request
  sendFriendRequest(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/request/${userId}`, {})
      .pipe(
        catchError(error => {
          // Log the detailed error
          console.error('Friend request error details:', error);
          return throwError(() => error);
        })
      );
  }

  // Cancel friend request
  cancelFriendRequest(userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/request-to/${userId}`).pipe(
      catchError(error => {
        console.error('Error cancelling friend request:', error);
        return throwError(() => error);
      })
    );
  }

  // Accept friend request
  acceptFriendRequest(requestId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/accept/${requestId}`, {});
  }

  // Reject friend request
  rejectFriendRequest(requestId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/request/${requestId}`);
  }

  // Remove friend
  removeFriend(friendId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${friendId}`);
  }
  
  // Unfriend a user (alias for removeFriend for clarity)
  unfriend(userId: string): Observable<any> {
    return this.removeFriend(userId);
  }
} 