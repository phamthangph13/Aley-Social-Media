import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { Notification } from '../models/notification.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ]
})
export class DashboardComponent implements OnInit {
  user: any = null;
  unreadNotificationCount: number = 0;
  notifications: Notification[] = [];
  showNotificationsPanel: boolean = false;
  
  constructor(
    private authService: AuthService,
    public router: Router,
    private notificationService: NotificationService
  ) { }
  
  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.user = user;
    });
    
    this.loadUserProfile();
    
    // Load notifications from service
    this.loadNotifications();
    
    // Subscribe to real-time notifications
    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadNotificationCount = count;
    });
    
    this.notificationService.notifications$.subscribe(notifications => {
      this.notifications = notifications;
    });
  }
  
  loadUserProfile(): void {
    this.authService.getProfile().subscribe();
  }
  
  loadNotifications() {
    this.notificationService.getNotifications().subscribe();
  }
  
  toggleNotificationsPanel() {
    this.showNotificationsPanel = !this.showNotificationsPanel;
  }
  
  markAsRead(notificationId: string) {
    this.notificationService.markAsRead(notificationId).subscribe();
  }
  
  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe();
  }
  
  getNotificationText(notification: Notification): string {
    const senderName = `${notification.sender.firstName} ${notification.sender.lastName}`;
    
    switch (notification.type) {
      case 'like':
        return `${senderName} đã thích bài viết của bạn`;
      case 'comment':
        return `${senderName} đã bình luận về bài viết của bạn`;
      case 'friend_request':
        return `${senderName} đã gửi cho bạn lời mời kết bạn`;
      default:
        return 'Bạn có thông báo mới';
    }
  }
  
  getNotificationTime(createdAt: string): string {
    const created = new Date(createdAt);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - created.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Vừa xong';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} phút trước`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    
    if (diffInHours < 24) {
      return `${diffInHours} giờ trước`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInDays < 30) {
      return `${diffInDays} ngày trước`;
    }
    
    return created.toLocaleDateString('vi-VN');
  }
  
  navigateFromNotification(notification: Notification) {
    this.markAsRead(notification._id);
    
    if (notification.type === 'friend_request') {
      this.router.navigate(['/dashboard/friends']);
    } else if (notification.type === 'like' || notification.type === 'comment') {
      // Navigate to the post if available
      if (notification.postId) {
        this.router.navigate(['/dashboard/post', notification.postId._id]);
      } else {
        this.router.navigate(['/dashboard/home']);
      }
    }
    
    this.showNotificationsPanel = false;
  }
  
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/auth/login']);
  }
} 