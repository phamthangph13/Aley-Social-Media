import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FriendsService } from '../../../services/friends.service';
import { environment } from '../../../../environments/environment';
import { ProfileNavigatorService } from '../../../services/profile-navigator.service';
import { AuthService } from '../../../services/auth.service';

interface Friend {
  _id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isOnline?: boolean;
  mutualFriendsCount?: number;
  commonInterestsCount?: number;
  hasSentRequest?: boolean;
  hasReceivedRequest?: boolean;
}

interface FriendRequest {
  _id: string;
  from: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    mutualFriendsCount?: number;
  };
  createdAt: Date;
}

@Component({
  selector: 'app-friends',
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class FriendsComponent implements OnInit {
  friendRequests: FriendRequest[] = [];
  friendsList: Friend[] = [];
  friendSuggestions: Friend[] = [];
  sentRequests: string[] = []; // IDs of users to whom we've sent requests
  currentUser: any = null;
  isLoading = {
    friends: false,
    requests: false,
    suggestions: false
  };
  errorMessage: string | null = null;
  
  // Cache timestamp cho URLs
  private timestampCache = new Date().getTime();
  
  constructor(
    private friendsService: FriendsService,
    private profileNavigator: ProfileNavigatorService,
    private router: Router,
    private authService: AuthService
  ) { }
  
  ngOnInit(): void {
    // Load current user data
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    
    this.loadFriends();
    this.loadFriendRequests();
    this.loadSentRequests();
    this.loadFriendSuggestions();
  }
  
  getAvatarUrl(userId: string): string {
    // Sử dụng timestamp cache thay vì tạo mới
    return `${environment.apiUrl}/profile/${userId}/avatar?t=${this.timestampCache}`;
  }
  
  getFullName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName}`;
  }
  
  loadFriends(): void {
    this.isLoading.friends = true;
    this.friendsService.getFriends().subscribe({
      next: (response) => {
        if (response.success) {
          this.friendsList = response.data.map((friend: any) => ({
            ...friend,
            isOnline: Math.random() > 0.5 // Mock online status for now
          }));
        }
        this.isLoading.friends = false;
      },
      error: (error) => {
        console.error('Error loading friends', error);
        this.isLoading.friends = false;
      }
    });
  }
  
  loadFriendRequests(): void {
    this.isLoading.requests = true;
    this.friendsService.getFriendRequests().subscribe({
      next: (response) => {
        if (response.success) {
          this.friendRequests = response.data;
          
          // After loading requests, refresh suggestions to ensure correct UI state
          this.updateSuggestionsList();
        }
        this.isLoading.requests = false;
      },
      error: (error) => {
        console.error('Error loading friend requests', error);
        this.isLoading.requests = false;
      }
    });
  }
  
  // Load sent friend requests
  loadSentRequests(): void {
    this.friendsService.getSentFriendRequests().subscribe({
      next: (response) => {
        if (response.success) {
          this.sentRequests = response.data.map((request: any) => request.to._id);
          
          // After loading sent requests, refresh suggestions to ensure correct UI state
          this.updateSuggestionsList();
        }
      },
      error: (error) => {
        console.error('Error loading sent friend requests', error);
      }
    });
  }
  
  // Update the suggestions list based on current state
  updateSuggestionsList(): void {
    // Get IDs of users who sent us requests
    const receivedRequestUserIds = this.friendRequests.map(req => req.from._id);
    
    // Update UI state for suggestions
    this.friendSuggestions = this.friendSuggestions.map(suggestion => {
      const suggestionCopy = {...suggestion};
      
      // Check if we've sent a request to this user
      if (this.sentRequests.includes(suggestion._id)) {
        suggestionCopy.hasSentRequest = true;
      }
      
      // Check if this user has sent us a request
      if (receivedRequestUserIds.includes(suggestion._id)) {
        suggestionCopy.hasReceivedRequest = true;
      }
      
      return suggestionCopy;
    });
  }
  
  loadFriendSuggestions(): void {
    this.isLoading.suggestions = true;
    this.friendsService.getFriendSuggestions().subscribe({
      next: (response) => {
        if (response.success) {
          this.friendSuggestions = response.data;
          
          // Update the UI state for suggestions
          this.updateSuggestionsList();
        }
        this.isLoading.suggestions = false;
      },
      error: (error) => {
        console.error('Error loading friend suggestions', error);
        this.isLoading.suggestions = false;
      }
    });
  }
  
  acceptRequest(requestId: string): void {
    this.friendsService.acceptFriendRequest(requestId).subscribe({
      next: (response) => {
        if (response.success) {
          // Remove from requests and reload friends
          this.friendRequests = this.friendRequests.filter(req => req._id !== requestId);
          this.loadFriends();
        }
      },
      error: (error) => {
        console.error('Error accepting friend request', error);
      }
    });
  }
  
  rejectRequest(requestId: string): void {
    this.friendsService.rejectFriendRequest(requestId).subscribe({
      next: (response) => {
        if (response.success) {
          // Remove from requests
          this.friendRequests = this.friendRequests.filter(req => req._id !== requestId);
        }
      },
      error: (error) => {
        console.error('Error rejecting friend request', error);
      }
    });
  }
  
  sendRequest(userId: string): void {
    this.friendsService.sendFriendRequest(userId).subscribe({
      next: (response) => {
        if (response.success) {
          // Add to sent requests
          this.sentRequests.push(userId);
          
          // Update the UI state for this suggestion
          const suggestionIndex = this.friendSuggestions.findIndex(s => s._id === userId);
          if (suggestionIndex !== -1) {
            const updatedSuggestion = {...this.friendSuggestions[suggestionIndex], hasSentRequest: true};
            this.friendSuggestions[suggestionIndex] = updatedSuggestion;
          }
        }
      },
      error: (error) => {
        // More detailed error logging
        console.error('Error sending friend request', error);
        
        // Display specific error message if available
        if (error.error && error.error.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'Không thể gửi lời mời kết bạn, vui lòng thử lại sau';
        }
        
        // Reset error message after 5 seconds
        setTimeout(() => {
          this.errorMessage = null;
        }, 5000);
      }
    });
  }
  
  // New method to cancel a friend request
  cancelRequest(userId: string): void {
    // Find the request ID for this user
    this.friendsService.cancelFriendRequest(userId).subscribe({
      next: (response) => {
        if (response.success) {
          // Remove from sent requests
          this.sentRequests = this.sentRequests.filter(id => id !== userId);
          
          // Update the UI state for this suggestion
          const suggestionIndex = this.friendSuggestions.findIndex(s => s._id === userId);
          if (suggestionIndex !== -1) {
            const updatedSuggestion = {...this.friendSuggestions[suggestionIndex], hasSentRequest: false};
            this.friendSuggestions[suggestionIndex] = updatedSuggestion;
          }
        }
      },
      error: (error) => {
        console.error('Error cancelling friend request', error);
        this.errorMessage = 'Không thể hủy lời mời kết bạn, vui lòng thử lại sau';
        
        setTimeout(() => {
          this.errorMessage = null;
        }, 5000);
      }
    });
  }
  
  // New method to directly accept a friend request from suggestions
  acceptRequestFromSuggestion(userId: string): void {
    // Find the request from this user
    const request = this.friendRequests.find(req => req.from._id === userId);
    if (request) {
      this.acceptRequest(request._id);
      
      // Update the UI state
      const suggestionIndex = this.friendSuggestions.findIndex(s => s._id === userId);
      if (suggestionIndex !== -1) {
        this.friendSuggestions = this.friendSuggestions.filter(s => s._id !== userId);
      }
    }
  }
  
  removeFriend(friendId: string): void {
    this.friendsService.removeFriend(friendId).subscribe({
      next: (response) => {
        if (response.success) {
          // Remove from friends list
          this.friendsList = this.friendsList.filter(friend => friend._id !== friendId);
        }
      },
      error: (error) => {
        console.error('Error removing friend', error);
      }
    });
  }
  
  // Chuyển hướng đến profile người dùng
  navigateToProfile(userId: string): void {
    if (!userId) return;
    
    // Ensure we check if this is current user
    if (this.currentUser && userId === this.currentUser._id) {
      this.router.navigate(['/dashboard/profile']);
    } else {
      // Fallback to the service which should handle this correctly
      this.profileNavigator.navigateToProfile(userId);
    }
  }
  
  // Kiểm tra xem có phải người dùng hiện tại không
  isCurrentUser(userId: string): boolean {
    return this.profileNavigator.isCurrentUser(userId);
  }
} 