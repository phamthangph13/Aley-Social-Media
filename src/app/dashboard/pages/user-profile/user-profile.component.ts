import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from '../../../services/profile.service';
import { environment } from '../../../../environments/environment';
import { FriendsService } from '../../../services/friends.service';
import { AuthService } from '../../../services/auth.service';
import { PostService } from '../../../services/post.service';
import { ProfileNavigatorService } from '../../../services/profile-navigator.service';
import { BlockService } from '../../../services/block.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MessagesService } from '../../../core/services/messages.service';
import { Subscription } from 'rxjs';
import { NgZone } from '@angular/core';
import { UserReportService } from '../../../services/user-report.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule]
})
export class UserProfileComponent implements OnInit, OnDestroy {
  userId: string | null = null;
  userProfile: any = null;
  isLoading = true;
  error: string | null = null;
  
  // Trạng thái kết bạn
  isFriend = false;
  hasPendingRequest = false; // Người dùng hiện tại đã gửi lời mời kết bạn
  hasReceivedRequest = false; // Người dùng hiện tại nhận được lời mời kết bạn
  isCurrentUser = false; // Đây có phải là profile của người dùng hiện tại?
  
  // Trạng thái chặn
  isBlocked = false; // Người dùng hiện tại đã chặn người dùng này
  isBlockedBy = false; // Người dùng này đã chặn người dùng hiện tại
  
  currentUserId: string | null = null;
  
  // Post data
  posts: any[] = [];
  postsLoading = false;
  postsError: string | null = null;
  currentPage = 1;
  totalPages = 0;
  totalPosts = 0;
  
  // Cache timestamp cho URLs
  private timestampCache = new Date().getTime();
  
  // Subscriptions
  private subscriptions: Subscription[] = [];
  
  // ID của request
  pendingRequestId: string | null = null;
  
  // Thêm biến showOptionsMenu
  showOptionsMenu = false;
  
  // Message modal properties
  showMessageModal = false;
  messageText = '';
  isSendingMessage = false;
  messageError: string | null = null;
  messageSuccess = false;

  // User report properties
  showReportModal = false;
  reportForm: FormGroup;
  isSubmittingReport = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private profileService: ProfileService,
    private friendsService: FriendsService,
    private authService: AuthService,
    private postService: PostService,
    private blockService: BlockService,
    private messagesService: MessagesService,
    private profileNavigator: ProfileNavigatorService,
    private zone: NgZone,
    private userReportService: UserReportService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    // Initialize the report form
    this.reportForm = this.fb.group({
      violationType: ['', [Validators.required]],
      additionalDetails: ['']
    });
  }

  ngOnInit(): void {
    // Lấy ID người dùng hiện tại từ localStorage trước
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        this.currentUserId = user._id || null;
      }
    } catch (e) {
      console.error('Error getting current user from localStorage', e);
    }
    
    // Đăng ký lắng nghe currentUser từ AuthService
    const authSub = this.authService.currentUser.subscribe(user => {
      this.currentUserId = user?._id || null;
      
      // Nếu đã có userId từ route, kiểm tra lại
      if (this.userId && this.userId === this.currentUserId) {
        this.router.navigate(['/dashboard/profile']);
      }
    });
    this.subscriptions.push(authSub);

    // Lấy ID người dùng từ route parameters
    const routeSub = this.route.paramMap.subscribe(params => {
      this.userId = params.get('id');
      
      if (this.userId) {
        // Kiểm tra nếu đây là profile của người dùng hiện tại
        if (this.userId === this.currentUserId) {
          this.router.navigate(['/dashboard/profile']);
          return;
        }
        
        this.loadUserProfile();
        this.checkFriendshipStatus();
        this.checkBlockStatus();
        this.loadUserPosts();
      }
    });
    this.subscriptions.push(routeSub);
  }
  
  ngOnDestroy(): void {
    // Hủy đăng ký tất cả các subscription khi component bị hủy
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getAvatarUrl(userId: string | undefined): string {
    if (!userId) return 'assets/images/default-avatar.png';
    // Sử dụng timestamp cache thay vì tạo mới
    return `${environment.apiUrl}/profile/${userId}/avatar?t=${this.timestampCache}`;
  }

  getCoverImageUrl(userId: string | undefined): string {
    if (!userId) return 'assets/images/default-cover.jpg';
    // Sử dụng timestamp cache thay vì tạo mới
    return `${environment.apiUrl}/profile/${userId}/cover?t=${this.timestampCache}`;
  }

  loadUserProfile(): void {
    if (!this.userId) return;

    this.isLoading = true;
    this.profileService.getProfileById(this.userId).subscribe({
      next: (data) => {
        this.userProfile = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Không thể tải thông tin người dùng';
        this.isLoading = false;
        console.error('Error loading user profile:', err);
      }
    });
  }

  checkFriendshipStatus(): void {
    if (!this.userId) return;

    // Kiểm tra danh sách bạn bè
    this.friendsService.getFriends().subscribe({
      next: (response) => {
        // Kiểm tra xem người dùng có trong danh sách bạn bè không
        const friends = response.data || response;
        this.isFriend = friends.some((friend: any) => friend._id === this.userId);
        
        if (!this.isFriend) {
          // Kiểm tra lời mời kết bạn đã gửi
          this.friendsService.getSentFriendRequests().subscribe({
            next: (sentResponse) => {
              const sentRequests = sentResponse.data || sentResponse;
              this.hasPendingRequest = sentRequests.some((req: any) => 
                req.to._id === this.userId || req.to === this.userId
              );
            }
          });
          
          // Kiểm tra lời mời kết bạn đã nhận
          this.friendsService.getFriendRequests().subscribe({
            next: (receivedResponse) => {
              const receivedRequests = receivedResponse.data || receivedResponse;
              // Lưu lại request ID của lời mời kết bạn từ người dùng hiện tại
              const friendRequest = receivedRequests.find((req: any) => 
                (req.from._id === this.userId || req.from === this.userId)
              );
              
              if (friendRequest) {
                this.hasReceivedRequest = true;
                // Lưu lại ID của request để sử dụng khi accept/reject
                this.pendingRequestId = friendRequest._id;
              } else {
                this.hasReceivedRequest = false;
              }
            }
          });
        }
      },
      error: (err) => {
        console.error('Error checking friendship status:', err);
      }
    });
  }

  sendFriendRequest(): void {
    if (!this.userId) return;
    
    this.friendsService.sendFriendRequest(this.userId).subscribe({
      next: () => {
        this.hasPendingRequest = true;
      },
      error: (err) => {
        console.error('Error sending friend request:', err);
      }
    });
  }
  
  acceptFriendRequest(): void {
    if (!this.pendingRequestId) {
      console.error('No pending friend request ID found.');
      return;
    }
    
    this.friendsService.acceptFriendRequest(this.pendingRequestId).subscribe({
      next: () => {
        this.hasReceivedRequest = false;
        this.isFriend = true;
        this.pendingRequestId = null; // Reset request ID sau khi chấp nhận
      },
      error: (err) => {
        console.error('Error accepting friend request:', err);
      }
    });
  }
  
  cancelFriendRequest(): void {
    if (!this.userId) return;
    
    this.friendsService.cancelFriendRequest(this.userId).subscribe({
      next: () => {
        this.hasPendingRequest = false;
      },
      error: (err) => {
        console.error('Error canceling friend request:', err);
      }
    });
  }
  
  rejectFriendRequest(): void {
    if (!this.pendingRequestId) {
      console.error('No pending friend request ID found.');
      return;
    }
    
    this.friendsService.rejectFriendRequest(this.pendingRequestId).subscribe({
      next: () => {
        this.hasReceivedRequest = false;
        this.pendingRequestId = null; // Reset request ID sau khi từ chối
      },
      error: (err) => {
        console.error('Error rejecting friend request:', err);
      }
    });
  }
  
  removeFriend(): void {
    if (!this.userId) return;
    
    this.friendsService.unfriend(this.userId).subscribe({
      next: () => {
        this.isFriend = false;
      },
      error: (err) => {
        console.error('Error removing friend:', err);
      }
    });
  }

  loadUserPosts(): void {
    if (!this.userId) return;
    
    this.postsLoading = true;
    this.postsError = null;
    
    this.postService.getUserProfilePosts(this.userId, this.currentPage).subscribe({
      next: (response) => {
        this.posts = response.posts;
        this.totalPosts = response.totalPosts;
        this.totalPages = response.totalPages;
        this.postsLoading = false;
      },
      error: (err) => {
        this.postsError = 'Không thể tải bài viết';
        this.postsLoading = false;
        console.error('Error loading user posts:', err);
      }
    });
  }
  
  loadMorePosts(): void {
    if (this.currentPage >= this.totalPages || this.postsLoading) return;
    
    this.currentPage++;
    this.postsLoading = true;
    
    this.postService.getUserProfilePosts(this.userId!, this.currentPage).subscribe({
      next: (response) => {
        this.posts = [...this.posts, ...response.posts];
        this.postsLoading = false;
      },
      error: (err) => {
        this.postsError = 'Không thể tải thêm bài viết';
        this.postsLoading = false;
        this.currentPage--; // Revert page number if failed
        console.error('Error loading more posts:', err);
      }
    });
  }

  checkBlockStatus(): void {
    if (!this.userId) return;
    
    this.blockService.checkBlockStatus(this.userId).subscribe({
      next: (response) => {
        this.isBlocked = response.isBlocked;
        this.isBlockedBy = response.isBlockedBy;
      },
      error: (err) => {
        console.error('Error checking block status:', err);
      }
    });
  }

  // Updated startConversation method
  startConversation(event?: Event): void {
    if (event) {
      event.stopPropagation(); // Ngăn sự kiện lan ra ngoài
    }
    
    if (!this.userId) {
      return;
    }
    
    // Show message modal instead of navigating
    this.showMessageModal = true;
    this.messageText = '';
    this.messageError = null;
    this.messageSuccess = false;
    
    // Đăng ký sự kiện click outside cho modal sau một khoảng thời gian ngắn
    setTimeout(() => {
      document.addEventListener('click', this.checkModalClickOutside);
    }, 100);
  }
  
  // Close message modal
  closeMessageModal(event?: Event): void {
    if (event) {
      event.stopPropagation(); // Ngăn sự kiện lan ra ngoài
    }
    
    this.showMessageModal = false;
    // Hủy đăng ký sự kiện click outside
    document.removeEventListener('click', this.checkModalClickOutside);
  }
  
  // Kiểm tra click outside modal
  checkModalClickOutside = (event: any): void => {
    const modalDialog = document.querySelector('.modal-dialog');
    
    if (this.showMessageModal && modalDialog && !modalDialog.contains(event.target)) {
      // Nếu click không phải trong modal-dialog, đóng modal
      this.closeMessageModal();
      // Cần gọi detectChanges để cập nhật UI trong sự kiện bên ngoài Angular
      this.zone.run(() => {});
    }
  }
  
  // Send message
  sendMessage(): void {
    if (!this.userId || !this.messageText.trim()) {
      return;
    }
    
    this.isSendingMessage = true;
    this.messageError = null;
    
    this.messagesService.createConversation(this.userId, this.messageText.trim()).subscribe({
      next: (response) => {
        this.isSendingMessage = false;
        this.messageSuccess = true;
        
        // Reset form after 2 seconds and close modal
        setTimeout(() => {
          this.messageText = '';
          this.messageSuccess = false;
          this.showMessageModal = false;
        }, 2000);
      },
      error: (err) => {
        this.isSendingMessage = false;
        this.messageError = 'Không thể gửi tin nhắn. Vui lòng thử lại sau.';
        console.error('Error sending message:', err);
      }
    });
  }
  
  // Thêm phương thức toggleOptionsMenu
  toggleOptionsMenu(event: Event): void {
    event.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
    this.showOptionsMenu = !this.showOptionsMenu;
    
    // Thêm sự kiện click outside để đóng dropdown khi click ra ngoài
    if (this.showOptionsMenu) {
      setTimeout(() => {
        document.addEventListener('click', this.closeOptionsMenu);
      }, 0);
    } else {
      document.removeEventListener('click', this.closeOptionsMenu);
    }
  }
  
  // Thêm phương thức closeOptionsMenu
  closeOptionsMenu = (): void => {
    this.showOptionsMenu = false;
    document.removeEventListener('click', this.closeOptionsMenu);
  }
  
  // Thêm phương thức reportUser
  reportUser(): void {
    if (!this.userId || !this.userProfile) {
      return;
    }
    
    // Close options menu
    this.closeOptionsMenu();
    
    // Show report modal
    this.showReportModal = true;
    
    // Reset the form
    this.reportForm.reset();
  }
  
  cancelReport(): void {
    this.showReportModal = false;
    this.reportForm.reset();
  }
  
  submitReport(): void {
    if (this.reportForm.invalid || !this.userId) {
      return;
    }
    
    this.isSubmittingReport = true;
    
    const violationType = this.reportForm.value.violationType;
    const additionalDetails = this.reportForm.value.additionalDetails;
    
    this.userReportService.reportUser(this.userId, violationType, additionalDetails).subscribe({
      next: (response) => {
        this.toastr.success('Báo cáo đã được gửi thành công. Cảm ơn bạn đã góp phần xây dựng cộng đồng!');
        this.cancelReport();
        this.isSubmittingReport = false;
      },
      error: (error) => {
        console.error('Error submitting user report:', error);
        if (error.status === 400 && error.error.message) {
          this.toastr.error(error.error.message);
        } else {
          this.toastr.error('Đã xảy ra lỗi khi gửi báo cáo. Vui lòng thử lại sau.');
        }
        this.isSubmittingReport = false;
      }
    });
  }
  
  // Cập nhật phương thức blockUser & unblockUser để đóng menu sau khi thực hiện
  blockUser(): void {
    if (!this.userId) return;
    
    this.closeOptionsMenu(); // Đóng menu
    
    this.blockService.blockUser(this.userId).subscribe({
      next: () => {
        this.isBlocked = true;
        
        // Reset các trạng thái kết bạn vì chặn sẽ hủy kết bạn
        this.isFriend = false;
        this.hasPendingRequest = false;
        this.hasReceivedRequest = false;
        
        // Tải lại các bài viết để cập nhật giao diện
        this.loadUserPosts();
      },
      error: (err) => {
        console.error('Error blocking user:', err);
        this.error = 'Không thể chặn người dùng, vui lòng thử lại sau.';
      }
    });
  }
  
  unblockUser(): void {
    if (!this.userId) return;
    
    this.closeOptionsMenu(); // Đóng menu
    
    this.blockService.unblockUser(this.userId).subscribe({
      next: () => {
        this.isBlocked = false;
      },
      error: (err) => {
        console.error('Error unblocking user:', err);
        this.error = 'Không thể bỏ chặn người dùng, vui lòng thử lại sau.';
      }
    });
  }
} 