import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { ProfileService } from '../../../services/profile.service';

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

interface BlockedUser {
  id: string;
  displayName: string;
  username: string;
  avatar?: string;
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
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadBlockedUsers();
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
    this.profileService.getBlockedUsers().subscribe({
      next: (users: BlockedUser[]) => {
        this.blockedUsers = users;
        this.isLoadingBlockedUsers = false;
      },
      error: (err: any) => {
        this.error = 'Không thể tải danh sách người dùng đã chặn.';
        this.isLoadingBlockedUsers = false;
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
    this.profileService.unblockUser(userId).subscribe({
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