import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { ProfileService } from '../../../services/profile.service';
import { BlockService, BlockedUser } from '../../../services/block.service';

interface UserSettings {
  email?: string;
  language?: string;
  notificationPreferences?: {
    emailNotifications?: boolean;
    friendRequests?: boolean;
    messages?: boolean;
    postLikes?: boolean;
    postComments?: boolean;
  };
  privacySettings?: {
    profileVisibility?: string;
    friendListVisibility?: string;
    postDefaultPrivacy?: string;
  };
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class SettingsComponent implements OnInit {
  isLoading = false;
  error: string | null = null;
  activeTab = 'account';
  
  // Form groups
  profileForm!: FormGroup;
  accountForm!: FormGroup;
  notificationForm!: FormGroup;
  privacyForm!: FormGroup;
  
  // Blocked users list
  blockedUsers: BlockedUser[] = [];
  isLoadingBlockedUsers = false;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private blockService: BlockService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.initForms();
    this.loadUserSettings();
    this.loadBlockedUsers();
    
    // Check URL parameters to see if we should show a specific tab
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'blocked') {
        this.activeTab = 'blocked';
      }
    });
    
    // Check current URL path to detect if redirected from blocked-users
    const currentUrl = this.router.url;
    if (currentUrl.includes('blocked-users')) {
      this.activeTab = 'blocked';
    }
  }

  initForms(): void {
    // Profile form
    this.profileForm = this.fb.group({
      displayName: [''],
      bio: [''],
      location: [''],
      website: ['']
    });

    // Account form
    this.accountForm = this.fb.group({
      email: [''],
      currentPassword: [''],
      newPassword: [''],
      confirmPassword: ['']
    });

    // Notification form
    this.notificationForm = this.fb.group({
      emailNotifications: [true],
      likeNotifications: [true],
      commentNotifications: [true],
      followNotifications: [true]
    });

    // Privacy form
    this.privacyForm = this.fb.group({
      postVisibility: ['public'],
      messagePrivacy: ['everyone'],
      profileVisibility: [true],
      searchVisibility: [true]
    });
  }
  
  loadBlockedUsers(): void {
    this.isLoadingBlockedUsers = true;
    this.blockService.getBlockedUsers().subscribe({
      next: (response) => {
        this.blockedUsers = response.blockedUsers;
        this.isLoadingBlockedUsers = false;
      },
      error: (err) => {
        console.error('Error loading blocked users:', err);
        this.isLoadingBlockedUsers = false;
      }
    });
  }

  loadUserSettings(): void {
    // Get user profile data
    this.authService.getProfile().subscribe({
      next: (user) => {
        if (user) {
          // Populate account form
          this.accountForm.patchValue({
            email: user.email
          });
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading user settings:', err);
        this.error = 'Không thể tải thông tin cài đặt. Vui lòng thử lại sau.';
        this.isLoading = false;
      }
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  saveAccountSettings(): void {
    this.isLoading = true;
    this.profileService.updateProfile(this.accountForm.value).subscribe({
      next: (response: any) => {
        this.notificationService.showSuccess('Cài đặt tài khoản đã được cập nhật');
        this.isLoading = false;
      },
      error: (err: any) => {
        this.error = 'Không thể cập nhật cài đặt tài khoản.';
        this.isLoading = false;
      }
    });
  }

  saveNotificationSettings(): void {
    this.isLoading = true;
    this.profileService.updateNotificationPreferences(this.notificationForm.value).subscribe({
      next: (response: any) => {
        this.notificationService.showSuccess('Cài đặt thông báo đã được cập nhật');
        this.isLoading = false;
      },
      error: (err: any) => {
        this.error = 'Không thể cập nhật cài đặt thông báo.';
        this.isLoading = false;
      }
    });
  }

  savePrivacySettings(): void {
    this.isLoading = true;
    this.profileService.updatePrivacySettings(this.privacyForm.value).subscribe({
      next: (response: any) => {
        this.notificationService.showSuccess('Cài đặt quyền riêng tư đã được cập nhật');
        this.isLoading = false;
      },
      error: (err: any) => {
        this.error = 'Không thể cập nhật cài đặt quyền riêng tư.';
        this.isLoading = false;
      }
    });
  }

  unblockUser(userId: string): void {
    this.isLoading = true;
    this.blockService.unblockUser(userId).subscribe({
      next: () => {
        this.blockedUsers = this.blockedUsers.filter(user => user.id !== userId);
        this.notificationService.showSuccess('Đã bỏ chặn người dùng thành công');
        this.isLoading = false;
      },
      error: (err: any) => {
        this.error = 'Không thể bỏ chặn người dùng.';
        this.isLoading = false;
      }
    });
  }

  changePassword(): void {
    if (this.accountForm.value.newPassword !== this.accountForm.value.confirmPassword) {
      this.error = 'Mật khẩu xác nhận không khớp';
      return;
    }
    
    this.isLoading = true;
    this.authService.changePassword(
      this.accountForm.value.currentPassword,
      this.accountForm.value.newPassword
    ).subscribe({
      next: (response: any) => {
        this.notificationService.showSuccess('Mật khẩu đã được cập nhật');
        this.accountForm.reset();
        this.isLoading = false;
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Không thể cập nhật mật khẩu.';
        this.isLoading = false;
      }
    });
  }

  clearError(): void {
    this.error = null;
  }
} 