import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileNavigatorService {
  private currentUserId: string | null = null;
  private isInitialized = false;
  private pendingNavigations: {userId: string, timestamp: number}[] = [];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    // Lấy ID người dùng hiện tại từ localStorage trước
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        // Handle different ID formats (some APIs might return id, others _id)
        this.currentUserId = user._id || user.id || null;
      }
    } catch (e) {
      console.error('Error getting current user from localStorage', e);
    }

    // Sau đó đăng ký theo dõi thay đổi từ service
    this.authService.currentUser.subscribe(user => {
      // Handle different ID formats
      this.currentUserId = user?._id || user?.id || null;
      this.isInitialized = true;
      
      // Xử lý các chuyển hướng đang chờ
      this.processPendingNavigations();
    });
  }

  /**
   * Điều hướng đến profile của người dùng
   * Nếu là profile của người dùng hiện tại thì chuyển đến /dashboard/profile
   * Nếu là profile của người khác thì chuyển đến /dashboard/user/:id
   */
  navigateToProfile(userId: string): void {
    if (!userId) return;

    console.log('NavigateToProfile:', { userId, currentUserId: this.currentUserId, equal: userId === this.currentUserId });

    // Nếu service chưa khởi tạo xong, thêm vào danh sách chờ
    if (!this.isInitialized) {
      this.pendingNavigations.push({userId, timestamp: Date.now()});
      
      // Kiểm tra nếu đã có thông tin người dùng từ localStorage
      if (this.currentUserId) {
        this.performNavigation(userId);
      }
      return;
    }

    this.performNavigation(userId);
  }

  private performNavigation(userId: string): void {
    // Normalize IDs to string before comparison to avoid type issues
    const normalizedUserId = String(userId);
    const normalizedCurrentUserId = this.currentUserId ? String(this.currentUserId) : null;
    
    if (normalizedUserId === normalizedCurrentUserId) {
      console.log('Navigating to own profile: /dashboard/profile');
      this.router.navigate(['/dashboard/profile']);
    } else {
      console.log('Navigating to user profile:', userId);
      this.router.navigate(['/dashboard/user', userId]);
    }
  }

  private processPendingNavigations(): void {
    // Xử lý các chuyển hướng đang chờ và loại bỏ các yêu cầu quá cũ (> 5 giây)
    const currentTime = Date.now();
    const validNavigations = this.pendingNavigations.filter(
      nav => currentTime - nav.timestamp < 5000
    );
    
    if (validNavigations.length > 0) {
      // Chỉ xử lý yêu cầu gần nhất
      const latestNavigation = validNavigations[validNavigations.length - 1];
      this.performNavigation(latestNavigation.userId);
    }
    
    // Xóa danh sách chờ
    this.pendingNavigations = [];
  }

  /**
   * Kiểm tra xem có phải người dùng hiện tại không
   */
  isCurrentUser(userId: string): boolean {
    if (!userId || !this.currentUserId) return false;
    
    // Normalize IDs to string before comparison to avoid type issues
    return String(userId) === String(this.currentUserId);
  }
} 