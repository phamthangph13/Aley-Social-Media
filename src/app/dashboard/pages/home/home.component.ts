import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PostService } from '../../../services/post.service';
import { Post, PostCreateDto } from '../../../models/post.model';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ProfileNavigatorService } from '../../../services/profile-navigator.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule]
})
export class HomeComponent implements OnInit {
  posts: Post[] = [];
  postForm: FormGroup;
  editPostForm: FormGroup;
  isLoading = false;
  page = 1;
  limit = 10;
  totalPosts = 0;
  selectedFiles: File[] = [];
  previewImages: string[] = [];
  editingPost: Post | null = null;
  isEditingPostModal = false;
  editSelectedFiles: File[] = [];
  editPreviewImages: string[] = [];
  filesToRemove: string[] = [];
  currentUser: any = null;
  emotions = [
    { value: 'none', label: 'Không có' },
    { value: 'happy', label: 'Vui vẻ 😊' },
    { value: 'sad', label: 'Buồn 😢' },
    { value: 'angry', label: 'Tức giận 😠' },
    { value: 'excited', label: 'Phấn khích 🤩' },
    { value: 'surprised', label: 'Ngạc nhiên 😲' },
    { value: 'loved', label: 'Yêu thích ❤️' }
  ];
  
  privacyOptions = [
    { value: 'public', label: 'Công khai', icon: 'fa-globe' },
    { value: 'friends', label: 'Bạn bè', icon: 'fa-user-friends' },
    { value: 'private', label: 'Chỉ mình tôi', icon: 'fa-lock' }
  ];

  // Cache timestamp cho URLs
  private timestampCache = new Date().getTime();

  constructor(
    private postService: PostService,
    private authService: AuthService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private profileNavigator: ProfileNavigatorService,
    private router: Router
  ) {
    this.postForm = this.fb.group({
      content: ['', [Validators.required]],
      hashtags: [''],
      emotion: ['none'],
      privacy: ['public']
    });
    
    // Initialize the edit form
    this.editPostForm = this.fb.group({
      content: ['', [Validators.required]],
      hashtags: [''],
      emotion: ['none'],
      privacy: ['public']
    });
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadPosts();
  }

  loadCurrentUser(): void {
    this.authService.getProfile().subscribe({
      next: (userData: any) => {
        this.currentUser = userData.user;
      },
      error: (error: any) => {
        console.error('Error loading current user:', error);
      }
    });
  }

  loadPosts(): void {
    this.isLoading = true;
    this.postService.getPosts(this.page, this.limit).subscribe({
      next: (response) => {
        this.posts = response.posts;
        this.totalPosts = response.totalPosts;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading posts:', error);
        this.toastr.error('Không thể tải bài viết. Vui lòng thử lại sau.');
        this.isLoading = false;
      }
    });
  }

  onFileChange(event: any): void {
    if (event.target.files.length > 0) {
      const files = Array.from(event.target.files) as File[];
      this.selectedFiles = [...this.selectedFiles, ...files];
      
      // Create previews for images
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.previewImages.push(e.target.result);
          };
          reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
          // For videos, use a data URI placeholder instead of file
          this.previewImages.push('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiM2NjY2NjYiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI2MCIgcj0iMzAiIGZpbGw9IiMzMzMzMzMiLz48cG9seWdvbiBwb2ludHM9IjkwLDQ1IDkwLDc1IDEyMCw2MCIgZmlsbD0id2hpdGUiLz48dGV4dCB4PSIxMDAiIHk9IjEwMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VmlkZW8gUHJldmlldzwvdGV4dD48L3N2Zz4=');
        }
      }
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.previewImages.splice(index, 1);
  }

  submitPost(): void {
    if (this.postForm.invalid) {
      return;
    }
    
    const formData = new FormData();
    const postData: PostCreateDto = this.postForm.value;
    
    // Add text fields
    formData.append('content', postData.content);
    if (postData.hashtags) formData.append('hashtags', postData.hashtags);
    formData.append('emotion', postData.emotion || 'none');
    formData.append('privacy', postData.privacy || 'public');
    
    // Add media files
    this.selectedFiles.forEach(file => {
      formData.append('media', file);
    });
    
    this.isLoading = true;
    
    if (this.editingPost) {
      // Update existing post
      this.postService.updatePost(this.editingPost._id, postData).subscribe({
        next: (response) => {
          this.toastr.success('Bài viết đã được cập nhật thành công!');
          const index = this.posts.findIndex(p => p._id === this.editingPost?._id);
          if (index > -1) {
            this.posts[index] = response.post;
          }
          this.resetForm();
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error updating post:', error);
          this.toastr.error('Lỗi khi cập nhật bài viết. Vui lòng thử lại sau.');
          this.isLoading = false;
        }
      });
    } else {
      // Create new post
      this.postService.createPost(formData).subscribe({
        next: (response) => {
          this.toastr.success('Bài viết đã được tạo thành công!');
          this.posts.unshift(response.post);
          this.resetForm();
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error creating post:', error);
          this.toastr.error('Lỗi khi tạo bài viết. Vui lòng thử lại sau.');
          this.isLoading = false;
        }
      });
    }
  }

  resetForm(): void {
    this.postForm.reset({
      content: '',
      hashtags: '',
      emotion: 'none',
      privacy: 'public'
    });
    this.selectedFiles = [];
    this.previewImages = [];
    this.editingPost = null;
  }

  editPost(post: Post): void {
    this.editingPost = post;
    this.isEditingPostModal = true;
    
    // Initialize edit form
    this.editPostForm = this.fb.group({
      content: [post.content, [Validators.required]],
      hashtags: [post.hashtags ? post.hashtags.join(', ') : ''],
      emotion: [post.emotion || 'none'],
      privacy: [post.privacy || 'public']
    });
    
    // Reset edit media
    this.editSelectedFiles = [];
    this.editPreviewImages = [];
    this.filesToRemove = [];
  }

  cancelEditPost(): void {
    this.isEditingPostModal = false;
    this.editingPost = null;
    this.editSelectedFiles = [];
    this.editPreviewImages = [];
    this.filesToRemove = [];
  }

  onEditFileChange(event: any): void {
    if (event.target.files.length > 0) {
      const files = Array.from(event.target.files) as File[];
      this.editSelectedFiles = [...this.editSelectedFiles, ...files];
      
      // Create previews for images
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.editPreviewImages.push(e.target.result);
          };
          reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
          // For videos, use a placeholder
          this.editPreviewImages.push('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiM2NjY2NjYiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI2MCIgcj0iMzAiIGZpbGw9IiMzMzMzMzMiLz48cG9seWdvbiBwb2ludHM9IjkwLDQ1IDkwLDc1IDEyMCw2MCIgZmlsbD0id2hpdGUiLz48dGV4dCB4PSIxMDAiIHk9IjEwMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VmlkZW8gUHJldmlldzwvdGV4dD48L3N2Zz4=');
        }
      }
    }
  }

  removeEditFile(index: number): void {
    this.editSelectedFiles.splice(index, 1);
    this.editPreviewImages.splice(index, 1);
  }

  removeExistingImage(index: number): void {
    if (this.editingPost && this.editingPost.imageUrls) {
      this.filesToRemove.push(this.editingPost.imageUrls[index]);
    }
  }

  removeExistingVideo(index: number): void {
    if (this.editingPost && this.editingPost.videoUrls) {
      this.filesToRemove.push(this.editingPost.videoUrls[index]);
    }
  }

  updatePost(): void {
    if (!this.editingPost || this.editPostForm.invalid) {
      return;
    }
    
    this.isLoading = true;
    
    // First handle text update
    const postData = {
      content: this.editPostForm.value.content,
      hashtags: this.editPostForm.value.hashtags || '',
      emotion: this.editPostForm.value.emotion || 'none',
      privacy: this.editPostForm.value.privacy || 'public'
    };
    
    const postId = this.editingPost._id;
    
    // Update the post text content first
    this.postService.updatePost(postId, postData).subscribe({
      next: (response) => {
        // Only upload new media files if there are any
        if (this.editSelectedFiles.length > 0 && this.editingPost) {
          this.uploadMediaForPost(postId, response.post);
        } else {
          this.toastr.success('Bài viết đã được cập nhật thành công!');
          const index = this.posts.findIndex(p => p._id === postId);
          if (index > -1) {
            this.posts[index] = response.post;
          }
          this.cancelEditPost();
          this.isLoading = false;
        }
      },
      error: (error: any) => {
        console.error('Error updating post:', error);
        this.toastr.error('Lỗi khi cập nhật bài viết. Vui lòng thử lại sau.');
        this.isLoading = false;
      }
    });
  }

  // Helper method to upload media for a post
  uploadMediaForPost(postId: string, updatedPost: any): void {
    if (!postId || !updatedPost) {
      this.isLoading = false;
      this.cancelEditPost();
      return;
    }
    
    const formData = new FormData();
    
    // Add required text fields to avoid 400 Bad Request error
    formData.append('content', updatedPost.content || '');
    
    // Add files to remove if any
    if (this.filesToRemove.length > 0) {
      formData.append('filesToRemove', JSON.stringify(this.filesToRemove));
    }
    
    // Add media files
    this.editSelectedFiles.forEach(file => {
      formData.append('media', file);
    });
    
    // Use updatePostWithMedia endpoint instead of createPost
    this.postService.updatePostWithMedia(postId, formData).subscribe({
      next: (response) => {
        this.toastr.success('Bài viết đã được cập nhật thành công!');
        
        // Update the post in the UI
        const index = this.posts.findIndex(p => p._id === postId);
        if (index > -1) {
          this.posts[index] = response.post;
        }
        
        this.cancelEditPost();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error uploading media:', error);
        this.toastr.error('Lỗi khi tải lên tệp. Bài viết đã được cập nhật nhưng không có tệp mới.');
        this.isLoading = false;
        this.cancelEditPost();
      }
    });
  }

  deletePost(postId: string): void {
    if (confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) {
      this.postService.deletePost(postId).subscribe({
        next: () => {
          this.toastr.success('Bài viết đã được xóa thành công!');
          this.posts = this.posts.filter(post => post._id !== postId);
        },
        error: (error: any) => {
          console.error('Error deleting post:', error);
          this.toastr.error('Lỗi khi xóa bài viết. Vui lòng thử lại sau.');
        }
      });
    }
  }

  toggleLike(post: Post): void {
    this.postService.toggleLike(post._id).subscribe({
      next: (response) => {
        const index = this.posts.findIndex(p => p._id === post._id);
        if (index > -1) {
          // Update likes count
          if (post.likes.includes(this.currentUser._id)) {
            // Unlike the post
            this.posts[index].likes = this.posts[index].likes.filter(id => id !== this.currentUser._id);
          } else {
            // Like the post
            this.posts[index].likes.push(this.currentUser._id);
          }
        }
      },
      error: (error: any) => {
        console.error('Error toggling like:', error);
        this.toastr.error('Không thể thực hiện thao tác. Vui lòng thử lại sau.');
      }
    });
  }

  addComment(post: Post, commentText: string): void {
    if (!commentText.trim()) return;
    
    this.postService.addComment(post._id, commentText).subscribe({
      next: (response) => {
        const index = this.posts.findIndex(p => p._id === post._id);
        if (index > -1) {
          this.posts[index].comments.push(response.comment);
        }
      },
      error: (error: any) => {
        console.error('Error adding comment:', error);
        this.toastr.error('Không thể thêm bình luận. Vui lòng thử lại sau.');
      }
    });
  }

  loadMorePosts(): void {
    this.page++;
    this.isLoading = true;
    
    this.postService.getPosts(this.page, this.limit).subscribe({
      next: (response) => {
        this.posts = [...this.posts, ...response.posts];
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading more posts:', error);
        this.toastr.error('Không thể tải thêm bài viết. Vui lòng thử lại sau.');
        this.isLoading = false;
        this.page--; // Revert page increment
      }
    });
  }

  isPostOwner(post: Post): boolean {
    return this.currentUser && post.user._id === this.currentUser._id;
  }

  getPrivacyIcon(privacy: string): string {
    const option = this.privacyOptions.find(opt => opt.value === privacy);
    return option ? option.icon : 'fa-globe';
  }

  getEmotionEmoji(emotion: string): string {
    const option = this.emotions.find(opt => opt.value === emotion);
    return option ? option.label.split(' ')[1] || '' : '';
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) {
      return 'Vừa xong';
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} phút trước`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} giờ trước`;
    }
    
    const days = Math.floor(hours / 24);
    if (days < 30) {
      return `${days} ngày trước`;
    }
    
    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months} tháng trước`;
    }
    
    const years = Math.floor(months / 12);
    return `${years} năm trước`;
  }

  getAvatarUrl(userId: string): string {
    // Sử dụng timestamp cache thay vì tạo mới
    return `${environment.apiUrl}/profile/${userId}/avatar?t=${this.timestampCache}`;
  }

  // Chuyển hướng đến profile người dùng
  navigateToProfile(userId: string): void {
    if (!userId) return;
    
    // Add debug logging
    console.log('Home navigateToProfile:', {
      userId,
      currentUserId: this.currentUser?._id || this.currentUser?.id,
      isEqual: String(userId) === String(this.currentUser?._id || this.currentUser?.id)
    });
    
    // Ensure we check if this is current user with normalized string comparison
    if (this.currentUser && (String(userId) === String(this.currentUser._id) || String(userId) === String(this.currentUser.id))) {
      console.log('Home: Navigating to own profile');
      this.router.navigate(['/dashboard/profile']);
    } else {
      // Fallback to the service which should handle this correctly
      this.profileNavigator.navigateToProfile(userId);
    }
  }
  
  // Kiểm tra xem có phải người dùng hiện tại không
  isCurrentUser(userId: string): boolean {
    if (!userId) return false;
    return this.profileNavigator.isCurrentUser(userId);
  }
} 