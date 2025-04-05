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
  isLoading = false;
  page = 1;
  limit = 10;
  totalPosts = 0;
  selectedFiles: File[] = [];
  previewImages: string[] = [];
  editingPost: Post | null = null;
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

  constructor(
    private postService: PostService,
    private authService: AuthService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.postForm = this.fb.group({
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
    this.postForm.patchValue({
      content: post.content,
      hashtags: post.hashtags ? post.hashtags.join(', ') : '',
      emotion: post.emotion,
      privacy: post.privacy
    });
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    // Add a cache-busting query parameter to avoid browser caching
    const timestamp = new Date().getTime();
    return `${environment.apiUrl}/profile/${userId}/avatar?t=${timestamp}`;
  }
} 