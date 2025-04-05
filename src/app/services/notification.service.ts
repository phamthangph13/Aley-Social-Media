import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Notification, NotificationResponse, UnreadCountResponse } from '../models/notification.model';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  
  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private socketService: SocketService
  ) {
    this.initializeSocketListeners();
    this.monitorSocketConnection();
  }

  // Method to show success notification
  showSuccess(message: string): void {
    console.log('Success:', message);
    // Implementation will depend on your UI notification system
    // This could use a toast service or other notification system
    alert(message); // Temporary implementation - replace with proper UI notification
  }

  private initializeSocketListeners(): void {
    this.socketService.listenForEvent<Notification>('receiveNotification').subscribe(notification => {
      if (notification) {
        console.log('Received real-time notification:', notification);
        // Add the new notification to the list
        const currentNotifications = this.notificationsSubject.value;
        this.notificationsSubject.next([notification, ...currentNotifications]);
        
        // Increment unread count
        this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
      }
    });
  }

  private monitorSocketConnection(): void {
    // Monitor socket connection status
    this.socketService.connectionStatus$.subscribe(isConnected => {
      console.log('Socket connection status changed:', isConnected);
      
      // When reconnected, refresh notifications
      if (isConnected) {
        console.log('Socket reconnected, refreshing notifications');
        this.getNotifications().subscribe();
      }
    });
  }

  getNotifications(): Observable<NotificationResponse> {
    this.isLoadingSubject.next(true);
    return this.http.get<NotificationResponse>(this.apiUrl).pipe(
      tap(response => {
        console.log('Fetched notifications:', response);
        this.notificationsSubject.next(response.notifications);
        this.unreadCountSubject.next(response.unreadCount);
        this.isLoadingSubject.next(false);
      })
    );
  }

  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.apiUrl}/unread-count`).pipe(
      tap(response => {
        this.unreadCountSubject.next(response.unreadCount);
      })
    );
  }

  markAsRead(notificationId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${notificationId}/read`, {}).pipe(
      tap(() => {
        // Update the read status in our local state
        const currentNotifications = this.notificationsSubject.value;
        const updatedNotifications = currentNotifications.map(notification => {
          if (notification._id === notificationId) {
            return { ...notification, read: true };
          }
          return notification;
        });
        
        this.notificationsSubject.next(updatedNotifications);
        
        // Update unread count
        const unreadCount = updatedNotifications.filter(n => !n.read).length;
        this.unreadCountSubject.next(unreadCount);
      })
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.patch(`${this.apiUrl}/mark-all-read`, {}).pipe(
      tap(() => {
        // Mark all notifications as read in our local state
        const currentNotifications = this.notificationsSubject.value;
        const updatedNotifications = currentNotifications.map(notification => ({
          ...notification,
          read: true
        }));
        
        this.notificationsSubject.next(updatedNotifications);
        this.unreadCountSubject.next(0);
      })
    );
  }
  
  // Method to force refresh notifications
  refreshNotifications(): void {
    this.getNotifications().subscribe();
  }
} 