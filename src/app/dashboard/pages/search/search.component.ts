import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService } from '../../../services/search.service';
import { FriendsService } from '../../../services/friends.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe]
})
export class SearchComponent implements OnInit {
  searchQuery: string = '';
  users: any[] = [];
  posts: any[] = [];
  activeFilter: string = 'all';
  loading: boolean = false;
  searched: boolean = false;
  
  constructor(
    private searchService: SearchService,
    private friendsService: FriendsService
  ) { }
  
  ngOnInit(): void {
    // Component initialization logic
  }
  
  onSearch() {
    if (!this.searchQuery.trim()) return;
    
    this.loading = true;
    this.searched = true;
    
    if (this.activeFilter === 'all') {
      this.searchService.search(this.searchQuery).subscribe({
        next: (data) => {
          this.users = data.users;
          this.posts = data.posts;
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Search error:', error);
          this.loading = false;
        }
      });
    } else if (this.activeFilter === 'users') {
      this.searchService.searchUsers(this.searchQuery).subscribe({
        next: (data) => {
          this.users = data.users;
          this.posts = [];
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Users search error:', error);
          this.loading = false;
        }
      });
    } else if (this.activeFilter === 'posts') {
      this.searchService.searchPosts(this.searchQuery).subscribe({
        next: (data) => {
          this.users = [];
          this.posts = data.posts;
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Posts search error:', error);
          this.loading = false;
        }
      });
    }
  }
  
  setFilter(filter: string) {
    this.activeFilter = filter;
    if (this.searched && this.searchQuery.trim()) {
      this.onSearch();
    }
  }
  
  sendFriendRequest(userId: string) {
    this.friendsService.sendFriendRequest(userId).subscribe({
      next: (response: any) => {
        // Update the user's friendship status in our array
        const userIndex = this.users.findIndex(user => user._id === userId);
        if (userIndex !== -1) {
          this.users[userIndex].friendshipStatus = 'pending';
        }
      },
      error: (error: any) => {
        console.error('Error sending friend request:', error);
      }
    });
  }
  
  cancelFriendRequest(userId: string) {
    this.friendsService.cancelFriendRequest(userId).subscribe({
      next: (response: any) => {
        // Update the user's friendship status in our array
        const userIndex = this.users.findIndex(user => user._id === userId);
        if (userIndex !== -1) {
          this.users[userIndex].friendshipStatus = 'none';
        }
      },
      error: (error: any) => {
        console.error('Error canceling friend request:', error);
      }
    });
  }
  
  acceptFriendRequest(userId: string) {
    this.friendsService.acceptFriendRequest(userId).subscribe({
      next: (response: any) => {
        // Update the user's friendship status in our array
        const userIndex = this.users.findIndex(user => user._id === userId);
        if (userIndex !== -1) {
          this.users[userIndex].friendshipStatus = 'friends';
        }
      },
      error: (error: any) => {
        console.error('Error accepting friend request:', error);
      }
    });
  }
  
  rejectFriendRequest(userId: string) {
    this.friendsService.rejectFriendRequest(userId).subscribe({
      next: (response: any) => {
        // Update the user's friendship status in our array
        const userIndex = this.users.findIndex(user => user._id === userId);
        if (userIndex !== -1) {
          this.users[userIndex].friendshipStatus = 'none';
        }
      },
      error: (error: any) => {
        console.error('Error rejecting friend request:', error);
      }
    });
  }
  
  unfriend(userId: string) {
    this.friendsService.unfriend(userId).subscribe({
      next: (response: any) => {
        // Update the user's friendship status in our array
        const userIndex = this.users.findIndex(user => user._id === userId);
        if (userIndex !== -1) {
          this.users[userIndex].friendshipStatus = 'none';
        }
      },
      error: (error: any) => {
        console.error('Error unfriending:', error);
      }
    });
  }
  
  getFriendshipActionButton(user: any) {
    switch (user.friendshipStatus) {
      case 'none':
        return {
          text: 'Kết bạn',
          icon: 'fa-user-plus',
          action: () => this.sendFriendRequest(user._id)
        };
      case 'pending':
        return {
          text: 'Hủy yêu cầu',
          icon: 'fa-user-times',
          action: () => this.cancelFriendRequest(user._id)
        };
      case 'received':
        return {
          text: 'Chấp nhận',
          icon: 'fa-check',
          action: () => this.acceptFriendRequest(user._id)
        };
      case 'friends':
        return {
          text: 'Bạn bè',
          icon: 'fa-user-check',
          action: () => this.unfriend(user._id)
        };
      default:
        return {
          text: 'Kết bạn',
          icon: 'fa-user-plus',
          action: () => this.sendFriendRequest(user._id)
        };
    }
  }
} 